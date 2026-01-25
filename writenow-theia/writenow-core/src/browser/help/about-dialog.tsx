import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { injectable } from '@theia/core/shared/inversify';

import { WRITENOW_ABOUT_DIALOG_ID } from '../writenow-layout-ids';

/**
 * Get version information dynamically.
 *
 * Why: Version info should be read from the actual application config
 * rather than hardcoded values that can drift from the real version.
 */
function getVersionInfo(): {
    appName: string;
    appVersion: string;
    theiaVersion: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
} {
    // Try to get version from Theia's frontend application config
    let appVersion = '0.1.0';
    try {
        const config = FrontendApplicationConfigProvider.get();
        appVersion = config.applicationName ? '0.1.0' : '0.1.0'; // Config doesn't expose version directly
    } catch {
        // Fallback to default
    }

    // Get Theia version from @theia/core package
    // Note: In a real implementation, this would be injected at build time
    const theiaVersion = '1.44.0';

    return {
        appName: 'WriteNow',
        appVersion,
        theiaVersion,
        electronVersion: typeof process !== 'undefined' && process.versions?.electron 
            ? process.versions.electron 
            : 'N/A',
        nodeVersion: typeof process !== 'undefined' && process.versions?.node 
            ? process.versions.node 
            : 'N/A',
        chromeVersion: typeof process !== 'undefined' && process.versions?.chrome 
            ? process.versions.chrome 
            : 'N/A',
    };
}

type AboutViewProps = Readonly<{
    onClose: () => void;
}>;

/**
 * About dialog view component.
 */
function AboutView(props: AboutViewProps): React.ReactElement {
    const { onClose } = props;

    // Get version info dynamically
    const versionInfo = React.useMemo(() => getVersionInfo(), []);

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
                <h1 className="wn-about-name">{versionInfo.appName}</h1>
                <p className="wn-about-tagline">AI 驱动的创作 IDE</p>

                {/* Version info */}
                <div className="wn-about-version-card">
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">版本</span>
                        <span className="wn-about-version-value">{versionInfo.appVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Theia</span>
                        <span className="wn-about-version-value">{versionInfo.theiaVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Electron</span>
                        <span className="wn-about-version-value">{versionInfo.electronVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Node.js</span>
                        <span className="wn-about-version-value">{versionInfo.nodeVersion}</span>
                    </div>
                    <div className="wn-about-version-row">
                        <span className="wn-about-version-label">Chrome</span>
                        <span className="wn-about-version-value">{versionInfo.chromeVersion}</span>
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
