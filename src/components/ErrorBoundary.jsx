import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-xl text-center bg-error-container text-on-error-container rounded-xl">
          <h2 className="font-headline-sm mb-2">Something went wrong.</h2>
          <button onClick={() => window.location.reload()} className="bg-primary text-on-primary px-4 py-2 rounded-lg mt-4">Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
