import React from 'react';
import ChatWidget from './components/ChatWidget';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Spur AI Chat Support</h1>
        <p>Ask me anything about our store policies, shipping, returns, and more!</p>
      </header>
      <main className="App-main">
        <ChatWidget />
      </main>
    </div>
  );
}

export default App;


