import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '../../i18n';
import { useSettings } from '../../store/useApp';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Isyarat UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const lang = useSettings.getState().lang;
    return (
      <div role="alert" className="mx-auto my-16 max-w-lg rounded-[20px] border border-border-soft bg-surface p-8 shadow-soft">
        <h1 className="text-xl">{translate(lang, 'errorTitle')}</h1>
        <p className="mt-3 text-ink-muted">{translate(lang, 'errorBody')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-12 rounded-[12px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover"
            onClick={() => this.setState({ error: null })}
          >
            {translate(lang, 'errorRetry')}
          </button>
          <button
            type="button"
            className="min-h-12 rounded-[12px] border border-border px-5 font-bold"
            onClick={() => window.location.reload()}
          >
            {translate(lang, 'errorReload')}
          </button>
        </div>
      </div>
    );
  }
}
