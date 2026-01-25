import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CHARACTER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type { Character } from '../../common/ipc-generated';

/**
 * Character form state.
 */
type CharacterFormState = {
    name: string;
    description: string;
    traits: string[];
};

const INITIAL_FORM_STATE: CharacterFormState = {
    name: '',
    description: '',
    traits: [],
};

/**
 * Character management view component.
 */
function CharacterView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [characters, setCharacters] = React.useState<Character[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [projectId, setProjectId] = React.useState<string | null>(null);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    const [formState, setFormState] = React.useState<CharacterFormState>(INITIAL_FORM_STATE);
    const [traitInput, setTraitInput] = React.useState('');

    // Load project and characters
    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                // Get current project
                const projectRes = await frontendService.invokeResponse('project:getCurrent', {});
                if (!projectRes.ok || !projectRes.data.projectId) {
                    setLoading(false);
                    return;
                }
                const pid = projectRes.data.projectId;
                setProjectId(pid);

                // Load characters
                const res = await frontendService.invokeResponse('character:list', { projectId: pid });
                if (res.ok) {
                    setCharacters(res.data.characters);
                }
            } catch (error) {
                messageService.error(WN_STRINGS.characterLoadFailed(String(error)));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService]);

    const handleCreate = async (): Promise<void> => {
        if (!projectId || !formState.name.trim()) {
            messageService.warn(WN_STRINGS.characterNameRequired());
            return;
        }

        try {
            const res = await frontendService.invokeResponse('character:create', {
                projectId,
                name: formState.name.trim(),
                description: formState.description.trim() || undefined,
                traits: formState.traits.length > 0 ? formState.traits : undefined,
            });
            if (res.ok) {
                setCharacters((prev) => [...prev, res.data.character]);
                setFormState(INITIAL_FORM_STATE);
                setIsEditing(false);
                messageService.info(WN_STRINGS.characterCreateSuccess());
            } else {
                messageService.error(WN_STRINGS.characterCreateFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.characterCreateFailed(String(error)));
        }
    };

    const handleUpdate = async (): Promise<void> => {
        if (!projectId || !selectedId || !formState.name.trim()) {
            return;
        }

        try {
            const res = await frontendService.invokeResponse('character:update', {
                projectId,
                id: selectedId,
                name: formState.name.trim(),
                description: formState.description.trim() || undefined,
                traits: formState.traits.length > 0 ? formState.traits : undefined,
            });
            if (res.ok) {
                setCharacters((prev) =>
                    prev.map((c) => (c.id === selectedId ? res.data.character : c))
                );
                setFormState(INITIAL_FORM_STATE);
                setSelectedId(null);
                setIsEditing(false);
                messageService.info(WN_STRINGS.characterUpdateSuccess());
            } else {
                messageService.error(WN_STRINGS.characterUpdateFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.characterUpdateFailed(String(error)));
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        if (!projectId) return;

        try {
            const res = await frontendService.invokeResponse('character:delete', { projectId, id });
            if (res.ok) {
                setCharacters((prev) => prev.filter((c) => c.id !== id));
                if (selectedId === id) {
                    setSelectedId(null);
                    setFormState(INITIAL_FORM_STATE);
                    setIsEditing(false);
                }
                messageService.info(WN_STRINGS.characterDeleteSuccess());
            } else {
                messageService.error(WN_STRINGS.characterDeleteFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.characterDeleteFailed(String(error)));
        }
    };

    const handleEdit = (character: Character): void => {
        setSelectedId(character.id);
        setFormState({
            name: character.name,
            description: character.description ?? '',
            traits: Array.isArray(character.traits) ? (character.traits as string[]) : [],
        });
        setIsEditing(true);
    };

    const handleAddTrait = (): void => {
        const trait = traitInput.trim();
        if (trait && !formState.traits.includes(trait)) {
            setFormState((prev) => ({ ...prev, traits: [...prev.traits, trait] }));
            setTraitInput('');
        }
    };

    const handleRemoveTrait = (trait: string): void => {
        setFormState((prev) => ({
            ...prev,
            traits: prev.traits.filter((t) => t !== trait),
        }));
    };

    const handleCancel = (): void => {
        setFormState(INITIAL_FORM_STATE);
        setSelectedId(null);
        setIsEditing(false);
    };

    if (loading) {
        return (
            <div className="wn-p2-widget wn-character-widget" role="region" aria-label={WN_STRINGS.characterPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>{WN_STRINGS.loading()}</p>
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="wn-p2-widget wn-character-widget" role="region" aria-label={WN_STRINGS.characterPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('warning') + ' wn-empty-state-icon'} />
                    <p className="wn-empty-state-title">{WN_STRINGS.characterNoProject()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-character-widget" role="region" aria-label={WN_STRINGS.characterPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.characterPanel()}</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-button wn-settings-button--primary"
                        onClick={() => {
                            setIsEditing(true);
                            setSelectedId(null);
                            setFormState(INITIAL_FORM_STATE);
                        }}
                        aria-label={WN_STRINGS.characterNew()}
                    >
                        <span className={codicon('add')} /> {WN_STRINGS.characterNew()}
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {isEditing ? (
                    <div className="wn-character-form">
                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="character-name">
                                {WN_STRINGS.characterName()} *
                            </label>
                            <input
                                id="character-name"
                                type="text"
                                className="wn-settings-input"
                                value={formState.name}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder={WN_STRINGS.characterNamePlaceholder()}
                                aria-required="true"
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="character-description">
                                {WN_STRINGS.characterDescription()}
                            </label>
                            <textarea
                                id="character-description"
                                className="wn-settings-input"
                                rows={4}
                                value={formState.description}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder={WN_STRINGS.characterDescriptionPlaceholder()}
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label">{WN_STRINGS.characterTraits()}</label>
                            <div className="wn-character-traits">
                                {formState.traits.map((trait) => (
                                    <span key={trait} className="wn-character-trait">
                                        {trait}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTrait(trait)}
                                            aria-label={WN_STRINGS.characterRemoveTrait(trait)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                marginLeft: '4px',
                                            }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    className="wn-settings-input"
                                    value={traitInput}
                                    onChange={(e) => setTraitInput(e.target.value)}
                                    placeholder={WN_STRINGS.characterTraitPlaceholder()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTrait();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="wn-settings-button"
                                    onClick={handleAddTrait}
                                    aria-label={WN_STRINGS.characterTraitAdd()}
                                >
                                    {WN_STRINGS.add()}
                                </button>
                            </div>
                        </div>

                        <div className="wn-settings-actions" style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                className="wn-settings-button"
                                onClick={handleCancel}
                            >
                                {WN_STRINGS.cancel()}
                            </button>
                            <button
                                type="button"
                                className="wn-settings-button wn-settings-button--primary"
                                onClick={selectedId ? handleUpdate : handleCreate}
                            >
                                {selectedId ? WN_STRINGS.save() : WN_STRINGS.create()}
                            </button>
                        </div>
                    </div>
                ) : characters.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('person') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.characterEmpty()}</p>
                        <p className="wn-empty-state-description">
                            {WN_STRINGS.characterEmptyHint()}
                        </p>
                    </div>
                ) : (
                    <ul className="wn-list" role="list">
                        {characters.map((character) => (
                            <li
                                key={character.id}
                                className="wn-list-item"
                                role="listitem"
                            >
                                <span className={codicon('person') + ' wn-list-item-icon'} />
                                <div className="wn-list-item-content">
                                    <div className="wn-list-item-title">{character.name}</div>
                                    {character.description && (
                                        <div className="wn-list-item-subtitle">
                                            {character.description.slice(0, 50)}
                                            {character.description.length > 50 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                                <div className="wn-list-item-actions">
                                    <button
                                        type="button"
                                        className="wn-settings-icon-button"
                                        onClick={() => handleEdit(character)}
                                        aria-label={WN_STRINGS.characterEditAria(character.name)}
                                    >
                                        <span className={codicon('edit')} />
                                    </button>
                                    <button
                                        type="button"
                                        className="wn-settings-icon-button"
                                        onClick={() => handleDelete(character.id)}
                                        aria-label={WN_STRINGS.characterDeleteAria(character.name)}
                                    >
                                        <span className={codicon('trash')} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

@injectable()
export class CharacterWidget extends ReactWidget {
    static readonly ID = WRITENOW_CHARACTER_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = CharacterWidget.ID;
        this.title.label = WN_STRINGS.characterPanel();
        this.title.caption = WN_STRINGS.characterPanelCaption();
        this.title.iconClass = codicon('person');
        this.title.closable = true;
        this.addClass('writenow-character');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <CharacterView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
