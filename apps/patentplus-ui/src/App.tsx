// =============================================================================
// MIT License
// Copyright (c) 2026 Aparavi Software AG
// =============================================================================

/**
 * PATENT+ — root component rendered by the RocketRide shell.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import type { ShellAppProps } from 'shell';
import { AppLayout } from 'shell';
// @ts-ignore - Clean alias to the existing Patent+ root JSX application
import PatentPlusApp from '@patentplus/App';
import '@patentplus/index.css';

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('[PATENT+ Shell] Uncaught error inside application boundary:', error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100%',
						minHeight: '400px',
						backgroundColor: '#050706',
						color: '#F2F7F4',
						fontFamily: "'JetBrains Mono', monospace",
						padding: '32px',
						textAlign: 'center',
					}}
				>
					<div
						style={{
							fontSize: '11px',
							letterSpacing: '0.12em',
							color: '#FF6B5C',
							marginBottom: '8px',
							fontWeight: 700,
						}}
					>
						[PATENT+ ENGINE RECOVERY]
					</div>
					<h2 style={{ fontSize: '18px', margin: '0 0 12px', fontWeight: 600 }}>
						Application Encountered an Exception
					</h2>
					<p
						style={{
							fontSize: '12px',
							color: '#9EABA5',
							maxWidth: '480px',
							margin: '0 0 24px',
							lineHeight: 1.6,
						}}
					>
						{this.state.error?.message || 'An unexpected rendering error occurred inside the view tree.'}
					</p>
					<button
						onClick={this.handleReset}
						style={{
							padding: '8px 18px',
							background: '#2DD4A7',
							border: 'none',
							borderRadius: '4px',
							color: '#050706',
							fontFamily: "'JetBrains Mono', monospace",
							fontWeight: 700,
							fontSize: '11px',
							cursor: 'pointer',
							letterSpacing: '0.06em',
						}}
					>
						RELOAD INTERFACE
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

/**
 * Root view — renders the existing Patent+ application inside RocketRide's AppLayout.
 */
const App: React.FC<ShellAppProps> = (_props) => (
	<AppLayout>
		<AppErrorBoundary>
			<PatentPlusApp />
		</AppErrorBoundary>
	</AppLayout>
);

export default App;
