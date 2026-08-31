import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm font-semibold text-brand-600">Something went wrong</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-stone-900">This page could not be displayed</h1>
        <p className="mt-3 text-sm text-stone-600">{this.state.error.message}</p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Back to Dashboard</Link>
      </div>
    );
  }
}
