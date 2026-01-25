import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CHARACTER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
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
                messageService.error(`加载角色失败: ${String(error)}`);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService]);

    const handleCreate = async (): Promise<void> => {
        if (!projectId || !formState.name.trim()) {
            messageService.warn('请输入角色名称');
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
                messageService.info('角色创建成功');
            } else {
                messageService.error(`创建失败: ${res.error.message}`);
            }
        } catch (error) {
            messageService.error(`创建失败: ${String(error)}`);
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
                messageService.info('角色更新成功');
            } else {
                messageService.error(`更新失败: ${res.error.message}`);
            }
        } catch (error) {
            messageService.error(`更新失败: ${String(error)}`);
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
                messageService.info('角色删除成功');
            } else {
                messageService.error(`删除失败: ${res.error.message}`);
            }
        } catch (error) {
            messageService.error(`删除失败: ${String(error)}`);
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
            <div className="wn-p2-widget wn-character-widget" role="region" aria-label="角色管理">
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>加载中...</p>
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="wn-p2-widget wn-character-widget" role="region" aria-label="角色管理">
                <div className="wn-empty-state">
                    <span className={codicon('warning') + ' wn-empty-state-icon'} />
                    <p className="wn-empty-state-title">请先打开一个项目</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-character-widget" role="region" aria-label="角色管理">
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">角色管理</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-button wn-settings-button--primary"
                        onClick={() => {
                            setIsEditing(true);
                            setSelectedId(null);
                            setFormState(INITIAL_FORM_STATE);
                        }}
                        aria-label="新建角色"
                    >
                        <span className={codicon('add')} /> 新建
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {isEditing ? (
                    <div className="wn-character-form">
                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="character-name">
                                名称 *
                            </label>
                            <input
                                id="character-name"
                                type="text"
                                className="wn-settings-input"
                                value={formState.name}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="角色名称"
                                aria-required="true"
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="character-description">
                                描述
                            </label>
                            <textarea
                                id="character-description"
                                className="wn-settings-input"
                                rows={4}
                                value={formState.description}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="角色背景、性格等描述..."
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label">特征标签</label>
                            <div className="wn-character-traits">
                                {formState.traits.map((trait) => (
                                    <span key={trait} className="wn-character-trait">
                                        {trait}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTrait(trait)}
                                            aria-label={`移除 ${trait}`}
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
                                    placeholder="添加特征..."
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
                                    aria-label="添加特征"
                                >
                                    添加
                                </button>
                            </div>
                        </div>

                        <div className="wn-settings-actions" style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                className="wn-settings-button"
                                onClick={handleCancel}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                className="wn-settings-button wn-settings-button--primary"
                                onClick={selectedId ? handleUpdate : handleCreate}
                            >
                                {selectedId ? '保存' : '创建'}
                            </button>
                        </div>
                    </div>
                ) : characters.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('person') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">暂无角色</p>
                        <p className="wn-empty-state-description">
                            创建角色来管理你作品中的人物设定
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
                                        aria-label={`编辑 ${character.name}`}
                                    >
                                        <span className={codicon('edit')} />
                                    </button>
                                    <button
                                        type="button"
                                        className="wn-settings-icon-button"
                                        onClick={() => handleDelete(character.id)}
                                        aria-label={`删除 ${character.name}`}
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
        this.title.label = '角色管理';
        this.title.caption = '管理作品中的角色';
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
