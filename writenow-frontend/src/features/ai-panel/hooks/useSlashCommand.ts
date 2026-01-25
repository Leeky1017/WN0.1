/**
 * useSlashCommand
 * Why: Provide slash-command filtering + keyboard navigation without coupling to a specific command source.
 */

import { useMemo, useState } from 'react';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  skillId: string;
}

export interface SlashCommandMatch {
  command: SlashCommand | null;
  instruction: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function commandToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return '';
  return trimmed.split(/\\s+/)[0] ?? '';
}

/**
 * Why: Normalize `/command` input into a concrete command + instruction payload.
 */
export function resolveSlashCommandInput(input: string, commands: SlashCommand[]): SlashCommandMatch {
  const token = commandToken(input);
  if (!token) return { command: null, instruction: input };

  const normalizedToken = normalize(token);
  const command = commands.find((cmd) => normalize(cmd.name) === normalizedToken) ?? null;
  const instruction = input.slice(token.length).trim();
  return { command, instruction };
}

export interface UseSlashCommandResult {
  isOpen: boolean;
  query: string;
  commands: SlashCommand[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

/**
 * Hook for slash command menu state based on current input value.
 *
 * Note: We avoid resetting state via effects to keep lint rules strict; callers should clamp indices.
 */
export function useSlashCommand(input: string, allCommands: SlashCommand[]): UseSlashCommandResult {
  const [selectedIndexRaw, setSelectedIndexRaw] = useState(0);

  const isOpen = useMemo(() => {
    const trimmedStart = input.trimStart();
    if (!trimmedStart.startsWith('/')) return false;
    const token = commandToken(trimmedStart);
    if (!token) return false;
    const after = trimmedStart.slice(token.length);
    // Close the menu once the user starts writing instructions (`/cmd <text>`).
    return after.length === 0;
  }, [input]);

  const query = useMemo(() => {
    const token = commandToken(input);
    if (!token) return '';
    return normalize(token.slice(1));
  }, [input]);

  const commands = useMemo(() => {
    if (!query) return allCommands;
    return allCommands.filter((cmd) => {
      const name = normalize(cmd.name);
      const description = normalize(cmd.description);
      return name.includes(query) || description.includes(query) || normalize(cmd.id).includes(query);
    });
  }, [allCommands, query]);

  const selectedIndex = useMemo(() => {
    if (!isOpen) return 0;
    if (commands.length === 0) return 0;
    return Math.min(selectedIndexRaw, commands.length - 1);
  }, [commands.length, isOpen, selectedIndexRaw]);

  return {
    isOpen,
    query,
    commands,
    selectedIndex,
    setSelectedIndex: setSelectedIndexRaw,
  };
}

export default useSlashCommand;
