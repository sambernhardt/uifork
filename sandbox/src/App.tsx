import { useTheme } from "./components/theme-provider";

function App() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto space-y-16">
        <header className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-gray-500 dark:text-gray-400">uifork</h1>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </header>
        
        {/* Example 1 */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Example 1</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-inner">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[300px] flex justify-center">
              <div className="space-y-4 max-w-[400px] w-full">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">+12.5%</span>
                </div>
                <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">$45,231</div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Active Users</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">1,234</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Conversion</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">3.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example 2 */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Example 2</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-inner">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[300px] flex justify-center">
              <div className="space-y-4 max-w-[400px] w-full">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="w-full bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Example 3 */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Example 3</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-inner">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[300px] flex justify-center">
              <div className="flex flex-col items-center space-y-4 max-w-[400px] w-full">
                <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-gray-300">
                  JD
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-xl text-gray-900 dark:text-gray-100">John Doe</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Software Engineer</p>
                </div>
                <div className="flex gap-8 pt-4">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">127</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">89</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">42</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Following</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
