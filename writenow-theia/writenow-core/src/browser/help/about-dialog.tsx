import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { injectable } from '@theia/core/shared/inversify';

import { WRITENOW_ABOUT_DIALOG_ID } from '../writenow-layout-ids';

/**
 * Version information.
 * 
 * Why: These values are read from package.json at build time.
 * For now we use hardcoded values; in production these would be injected.
 */
const VERSION_INFO = {
    appName: 'WriteNow',
    appVersion: '0.1.0',
    theiaVersion: '1.44.0',
    electronVersion: '28.0.0',
    nodeVersion: process.versions?.node ?? 'N/A',
    chromeVersion: process.versions?.chrome ?? 'N/A',
};

type AboutViewProps = Readonly<{
    onClose: () => void;
}>;

/**
 * About dialog view component.
 */
function AboutView(props: AboutViewProps): React.ReactElement {
    const { onClose } = props;

    // Handle ESC key
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="wn-about-container" data-testid="writenow-about-dialog">
            <header className="wn-about-header">
                <button
                    type="button"
                    className="wn-about-close"
                    onClick={onClose}
                    title="关闭 (Esc)"
                >
                    <span className={codicon('close')} />
                </button>
            </header>

            <div className="wn-about-content">
                {/* Logo and name */}
                <div className="wn-about-logo">
                    <span className={`wn-about-icon ${codicon('edit')}`} />
                </div>
                <h1 className="wn-about-name">{VERSION_INFO.appName}</h1>
                <p className="wn-about-tagline">AI 驱动的创作 IDE</p>

                {/* Version info */}
                <div className="wn-about-version-card">
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">版本</span>
                        <span className="wn-about-version-value">{VERSION_INFO.appVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Theia</span>
                        <span className="wn-about-version-value">{VERSION_INFO.theiaVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Electron</span>
                        <span className="wn-about-version-value">{VERSION_INFO.electronVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Node.js</span>
                        <span className="wn-about-version-value">{VERSION_INFO.nodeVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Chrome</span>
                        <span className="wn-about-version-value">{VERSION_INFO.chromeVersion}</span>
                    </div>
                </div>

                {/* Copyright */}
                <p className="wn-about-copyright">
                    © 2024-2026 WriteNow Team
                </p>
            </div>

            <footer className="wn-about-footer">
                <a href="#" className="wn-about-link" onClick={(e) => e.preventDefault()}>
                    <span className={codicon('book')} /> 文档
                </a>
                <a href="#" className="wn-about-link" onClick={(e) => e.preventDefault()}>
                    <span className={codicon('github')} /> GitHub
                </a>
                <a href="#" className="wn-about-link" onClick={(e) => e.preventDefault()}>
                    <span className={codicon('comment-discussion')} /> 反馈
                </a>
            </footer>
        </div>
    );
}

/**
 * AboutDialog - Application information dialog.
 *
 * Why: Shows version info, credits, and useful links.
 * Accessible via Help > About menu.
 */
@injectable()
export class AboutDialog extends ReactWidget {
    static readonly ID = WRITENOW_ABOUT_DIALOG_ID;

    constructor() {
        super();
        this.id = AboutDialog.ID;
        this.title.label = '关于';
        this.title.caption = '关于 WriteNow';
        this.title.iconClass = codicon('info');
        this.title.closable = true;
        this.addClass('writenow-about-dialog');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <AboutView onClose={() => this.close()} />;
    }
}
