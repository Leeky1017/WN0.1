/**
 * Local LLM Tab completion (TipTap extension).
 * Why: Provide Cursor-style idle-triggered ghost text that can be accepted with Tab, while ensuring
 * cancel/timeout paths always clear pending UI state.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'

import type { ElectronAPI } from '@/types/electron-api'
import type {
  IpcResponse,
  LocalLlmTabCancelRequest,
  LocalLlmTabCancelResponse,
  LocalLlmTabCompleteRequest,
  LocalLlmTabCompleteResponse,
  LocalLlmTabStreamEvent,
} from '@/types/ipc-generated'

export type LocalLlmTabClient = {
  complete: (payload: LocalLlmTabCompleteRequest) => Promise<IpcResponse<LocalLlmTabCompleteResponse>>
  cancel: (payload: LocalLlmTabCancelRequest) => Promise<IpcResponse<LocalLlmTabCancelResponse>>
  onStream: (handler: (event: LocalLlmTabStreamEvent) => void) => () => void
}

export function createElectronLocalLlmTabClient(): LocalLlmTabClient | null {
  if (typeof window === 'undefined') return null
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI
  const localLlm = api?.localLlm
  if (!localLlm) return null

  if (!localLlm.complete || !localLlm.cancel || !localLlm.onStream) return null

  return {
    complete: localLlm.complete,
    cancel: localLlm.cancel,
    onStream: localLlm.onStream,
  }
}

export type SuggestionState = {
  runId: string | null
  pending: boolean
  suggestion: string
}

type SuggestionMeta =
  | { type: 'reset' }
  | { type: 'run'; runId: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error' }

const INITIAL_STATE: SuggestionState = { runId: null, pending: false, suggestion: '' }
export const localLlmTabPluginKey = new PluginKey<SuggestionState>('wn-local-llm-tab')

function getMeta(tr: Transaction): SuggestionMeta | null {
  const meta = tr.getMeta(localLlmTabPluginKey) as SuggestionMeta | undefined
  return meta ?? null
}

function shouldCancelOnKey(key: string): boolean {
  if (key === 'Escape') return true
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') return true
  if (key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown') return true
  return false
}

export type LocalLlmTabCompletionOptions = {
  enabled: boolean
  client: LocalLlmTabClient | null
  minPrefixChars: number
  maxPrefixChars: number
  maxSuffixChars: number
  idleDelayMs: number
  maxTokens: number
  temperature: number
  timeoutMs: number
  stop: string[]
}

export function createLocalLlmTabCompletionPlugin(options: LocalLlmTabCompletionOptions): Plugin<SuggestionState> {
  const enabled = options.enabled
  const client = options.client

  const idleDelayMs = options.idleDelayMs
  const minPrefixChars = options.minPrefixChars
  const maxPrefixChars = options.maxPrefixChars
  const maxSuffixChars = options.maxSuffixChars

  const maxTokens = options.maxTokens
  const temperature = options.temperature
  const timeoutMs = options.timeoutMs
  const stop = options.stop

  return new Plugin<SuggestionState>({
    key: localLlmTabPluginKey,
    state: {
      init: () => INITIAL_STATE,
      apply: (tr, value) => {
        const meta = getMeta(tr)
        if (!meta) return value
        if (meta.type === 'reset') return INITIAL_STATE
        if (meta.type === 'run') return { runId: meta.runId, pending: true, suggestion: '' }
        if (meta.type === 'delta') return { ...value, pending: true, suggestion: value.suggestion + meta.text }
        if (meta.type === 'done') return { ...value, runId: null, pending: false }
        if (meta.type === 'error') return INITIAL_STATE
        return value
      },
    },
    props: {
      decorations: (state) => {
        const current = localLlmTabPluginKey.getState(state)
        if (!current?.suggestion) return null
        if (!state.selection.empty) return null

        const widget = Decoration.widget(state.selection.to, () => {
          const span = document.createElement('span')
          span.className = 'wn-llm-ghost'
          span.textContent = current.suggestion
          return span
        })

        return DecorationSet.create(state.doc, [widget])
      },

      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
        const current = localLlmTabPluginKey.getState(view.state) ?? INITIAL_STATE

        if (event.key === 'Tab' && current.suggestion) {
          event.preventDefault()
          if (client && current.runId) {
            void client.cancel({ runId: current.runId, reason: 'user' }).catch(() => undefined)
          }
          view.dispatch(
            view.state.tr.insertText(current.suggestion).setMeta(localLlmTabPluginKey, { type: 'reset' } satisfies SuggestionMeta),
          )
          return true
        }

        if (event.key === 'Escape') {
          if (!current.suggestion && !current.runId) return false
          event.preventDefault()
          if (client && current.runId) {
            void client.cancel({ runId: current.runId, reason: 'user' }).catch(() => undefined)
          }
          view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'reset' } satisfies SuggestionMeta))
          return true
        }

        if (shouldCancelOnKey(event.key)) {
          if (!current.suggestion && !current.runId) return false
          if (client && current.runId) {
            void client.cancel({ runId: current.runId, reason: 'input' }).catch(() => undefined)
          }
          view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'reset' } satisfies SuggestionMeta))
          return false
        }

        return false
      },

      handleClick: (view) => {
        const current = localLlmTabPluginKey.getState(view.state) ?? INITIAL_STATE
        if (!current.suggestion && !current.runId) return false
        if (client && current.runId) {
          void client.cancel({ runId: current.runId, reason: 'input' }).catch(() => undefined)
        }
        view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'reset' } satisfies SuggestionMeta))
        return false
      },
    },

    view: (view) => {
      let idleTimer: ReturnType<typeof setTimeout> | null = null
      const clearIdleTimer = () => {
        if (!idleTimer) return
        clearTimeout(idleTimer)
        idleTimer = null
      }

      const cancelAndReset = (reason: LocalLlmTabCancelRequest['reason']) => {
        const current = localLlmTabPluginKey.getState(view.state) ?? INITIAL_STATE
        if (!current.suggestion && !current.runId) return
        clearIdleTimer()
        if (client && current.runId) {
          void client.cancel({ runId: current.runId, reason }).catch(() => undefined)
        }
        view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'reset' } satisfies SuggestionMeta))
      }

      const scheduleCompletion = () => {
        if (!enabled || !client) return
        if (!view.hasFocus()) return
        if (!view.state.selection.empty) return

        const selectionFrom = view.state.selection.from
        const selectionTo = view.state.selection.to
        const scheduledDoc = view.state.doc

        clearIdleTimer()
        idleTimer = setTimeout(() => {
          if (!enabled || !client) return
          if (!view.hasFocus()) return
          if (view.state.doc !== scheduledDoc) return
          if (!view.state.selection.empty) return
          if (view.state.selection.from !== selectionFrom || view.state.selection.to !== selectionTo) return

          const current = localLlmTabPluginKey.getState(view.state) ?? INITIAL_STATE
          if (current.runId || current.suggestion) return

          const start = Math.max(0, selectionFrom - maxPrefixChars)
          const end = Math.min(view.state.doc.content.size, selectionTo + maxSuffixChars)
          const prefix = view.state.doc.textBetween(start, selectionFrom, '\n', '\n')
          const suffix = view.state.doc.textBetween(selectionTo, end, '\n', '\n')

          if (prefix.trim().length < minPrefixChars) return

          void client
            .complete({
              prefix,
              suffix,
              maxTokens,
              temperature,
              timeoutMs,
              stop,
            })
            .then((res) => {
              if (!res.ok) return
              view.dispatch(
                view.state.tr.setMeta(localLlmTabPluginKey, { type: 'run', runId: res.data.runId } satisfies SuggestionMeta),
              )
            })
            .catch(() => {
              // ignore
            })
        }, idleDelayMs)
      }

      const unsubscribe = client
        ? client.onStream((event) => {
            const current = localLlmTabPluginKey.getState(view.state) ?? INITIAL_STATE
            if (event.runId !== current.runId) return
            if (event.type === 'delta') {
              view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'delta', text: event.text } satisfies SuggestionMeta))
              return
            }
            if (event.type === 'done') {
              view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'done' } satisfies SuggestionMeta))
              return
            }
            if (event.type === 'error') {
              view.dispatch(view.state.tr.setMeta(localLlmTabPluginKey, { type: 'error' } satisfies SuggestionMeta))
            }
          })
        : null

      return {
        update: (nextView, prevState) => {
          void prevState
          if (!enabled || !client) {
            clearIdleTimer()
            cancelAndReset('input')
            return
          }

          const selectionChanged = !nextView.state.selection.eq(prevState.selection)
          const docChanged = nextView.state.doc !== prevState.doc

          if (selectionChanged) {
            cancelAndReset('input')
            return
          }

          if (docChanged) {
            cancelAndReset('input')
            scheduleCompletion()
          }
        },
        destroy: () => {
          clearIdleTimer()
          unsubscribe?.()
        },
      }
    },
  })
}

export const LocalLlmTabCompletion = Extension.create<LocalLlmTabCompletionOptions>({
  name: 'localLlmTabCompletion',

  addOptions() {
    return {
      enabled: false,
      client: null,
      minPrefixChars: 24,
      maxPrefixChars: 4000,
      maxSuffixChars: 2000,
      idleDelayMs: 800,
      maxTokens: 48,
      temperature: 0.4,
      timeoutMs: 15_000,
      stop: ['\n\n'],
    }
  },

  addProseMirrorPlugins() {
    return [createLocalLlmTabCompletionPlugin(this.options)]
  },
})

export default LocalLlmTabCompletion

