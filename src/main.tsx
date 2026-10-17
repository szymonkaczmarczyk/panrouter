import '@fontsource-variable/dm-sans';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/sim.css';
import './styles/learn.css';
import { render } from 'preact';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
