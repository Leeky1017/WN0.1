import * as React from '@theia/core/shared/react';

import { codicon } from '@theia/core/lib/browser/widgets';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { injectable } from '@theia/core/shared/inversify';

import { WRITENOW_AI_PANEL_WIDGET_ID } from './writenow-layout-ids';

@injectable()
export class WritenowAiPanelPlaceholderWidget extends ReactWidget {
    static readonly ID = WRITENOW_AI_PANEL_WIDGET_ID;

    constructor() {
        super();
        this.id = WritenowAiPanelPlaceholderWidget.ID;
        this.title.label = 'AI Panel';
        this.title.caption = 'WriteNow AI Panel';
        this.title.iconClass = codicon('sparkle');
        this.title.closable = true;
        this.addClass('writenow-ai-panel');

        // Why: The placeholder is static; it only needs an initial render.
        this.update();
    }

    /**
     * Why: Phase 1 only reserves the layout slot; AI features will be implemented in later tasks.
     */
    protected override render(): React.ReactNode {
        return (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
                data-testid="writenow-ai-panel-placeholder"
            >
                <div style={{ fontWeight: 700 }}>AI Panel (placeholder)</div>
                <div style={{ opacity: 0.85, fontSize: 13, lineHeight: 1.5 }}>
                    This area is reserved for WriteNow’s AI features (inline assist, rewrite skills, knowledge tools).
                    Phase 1 only establishes the layout slot.
                </div>
            </div>
        );
    }
}
