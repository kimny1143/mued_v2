import { useState, useEffect } from 'react';
import { FragmentInput } from './components/FragmentInput';
import { tauriListen } from './utils/tauri';
import './index.css';

interface Fragment {
  id: string;
  content: string;
  timestamp: number;
  processed?: boolean;
}

function App() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    // Load saved fragments on app start
    loadFragments();

    // Listen for dashboard toggle
    const unlistenPromise = tauriListen('toggle-dashboard', () => {
      setShowDashboard(prev => !prev);
    });

    return () => {
      unlistenPromise.then(fn => fn());
    };
  }, []);

  const loadFragments = async () => {
    // TODO: Load fragments from database
    console.log('Loading fragments...');
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Fragment Input Overlay */}
      <FragmentInput />

      {/* Dashboard (future implementation) */}
      {showDashboard && (
        <div className="fixed inset-0 backdrop-blur-lg z-50" style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
          <div className="container mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-muednote-text">
                MUEDnote v3
              </h1>
              <button
                onClick={() => setShowDashboard(false)}
                className="text-muednote-muted hover:text-muednote-text transition-colors"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fragments.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muednote-muted text-lg">
                    まだFragmentがありません
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'rgba(138, 138, 138, 0.6)' }}>
                    Cmd+Shift+Space でConsoleを開いて入力してみてください
                  </p>
                </div>
              ) : (
                fragments.map(fragment => (
                  <div
                    key={fragment.id}
                    className="p-4 bg-muednote-secondary rounded-lg border border-muednote-secondary hover:border-muednote-accent transition-colors"
                  >
                    <div className="text-sm text-muednote-muted mb-2">
                      {new Date(fragment.timestamp).toLocaleString()}
                    </div>
                    <div className="text-muednote-text">
                      {fragment.content}
                    </div>
                    {fragment.processed && (
                      <div className="mt-2 text-xs text-muednote-success">
                        ✓ Processed
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;