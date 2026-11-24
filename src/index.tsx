import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RecoilRoot } from 'recoil';
import { missingEnvVariables } from './config/env';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

if (missingEnvVariables.length > 0) {
  root.render(
    <p style={{ fontFamily: 'sans-serif', padding: 24 }}>
      Missing environment variable(s): <code>{missingEnvVariables.join(', ')}</code>. Copy{' '}
      <code>.env.example</code> to <code>.env</code> and fill it in, then restart the dev server.
    </p>,
  );
} else {
  root.render(
    <RecoilRoot>
      <App />
    </RecoilRoot>,
  );
}
