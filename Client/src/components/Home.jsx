import "../stylesheet/App.css";

function App() {
  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <a href="/" className="brand">
          <div className="logo-placeholder">
            <img src="../images/logo.png" alt="Habit Tracker Logo" />
          </div>
          <span>habit tracker</span>
        </a>

        <div className="nav-actions">
          <a href="/login" className="login-link">
            Log in
          </a>
          <a href="/signup" className="signup-button">
            Sign up <span>↗</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-content">
          <div className="announcement">
            <span className="announcement-dot"></span>
            YOUR ROUTINE. YOUR RULES.
          </div>

          <h1>
            Small habits.
            <br />
            <span>Big changes.</span>
          </h1>

          <p className="hero-description">
            Build better habits, stay consistent, and become the person you want
            to be. One day at a time.
          </p>

          <div className="hero-actions">
            <a href="/signup" className="primary-button">
              Get started for free <span>↗</span>
            </a>
            <a href="/login" className="secondary-button">
              I already have an account
            </a>
          </div>

          <div className="hero-note">
            <span>✓</span> Free to start
            <span className="note-divider">·</span>
            Simple to use
            <span className="note-divider">·</span>
            Built for consistency
          </div>
        </div>

        {/* Habit Preview */}
        <div className="preview-wrapper">
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <p className="preview-label">YOUR PROGRESS</p>
                <h2>Today matters.</h2>
              </div>
              <div className="sun-icon">☀</div>
            </div>

            <div className="progress-section">
              <div className="progress-info">
                <span>Daily progress</span>
                <strong>2 of 3</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill"></div>
              </div>
            </div>

            <div className="habit-list">
              <div className="habit-item completed">
                <div className="habit-icon">📚</div>
                <div className="habit-details">
                  <strong>Read for 20 minutes</strong>
                  <span>Personal growth</span>
                </div>
                <div className="habit-check">✓</div>
              </div>

              <div className="habit-item completed">
                <div className="habit-icon">💧</div>
                <div className="habit-details">
                  <strong>Drink enough water</strong>
                  <span>Health & wellness</span>
                </div>
                <div className="habit-check">✓</div>
              </div>

              <div className="habit-item">
                <div className="habit-icon">💻</div>
                <div className="habit-details">
                  <strong>Practice coding</strong>
                  <span>Skill development</span>
                </div>
                <div className="habit-pending"></div>
              </div>
            </div>

            <div className="preview-footer">
              <span>Keep showing up.</span>
              <span className="streak">🔥 5-day streak</span>
            </div>
          </div>

          <div className="floating-note">
            <span className="floating-check">✓</span>
            <div>
              <strong>Progress, not perfection.</strong>
              <p>One habit at a time.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Strip */}
      <section className="features">
        <div className="feature">
          <span className="feature-number">01</span>
          <div>
            <h3>Build your routine</h3>
            <p>Create habits that fit your life.</p>
          </div>
        </div>

        <div className="feature">
          <span className="feature-number">02</span>
          <div>
            <h3>Track every day</h3>
            <p>See your consistency improve.</p>
          </div>
        </div>

        <div className="feature">
          <span className="feature-number">03</span>
          <div>
            <h3>Review your week</h3>
            <p>Learn from your progress.</p>
          </div>
        </div>
      </section>

      {/* Black Footer */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-brand-name">
              <div className="logo-placeholder">
                <img src="../images/logo.png" alt="Habit Tracker Logo" />
              </div>
              habit tracker
            </div>
            <p>
              Better habits. Better days.
              <br />
              Build a life you are proud of.
            </p>
          </div>

          <div className="footer-column">
            <h4>PRODUCT</h4>
            <a href="#features">Features</a>
            <a href="/signup">Get started</a>
            <a href="/login">Log in</a>
          </div>

          <div className="footer-column">
            <h4>YOUR JOURNEY</h4>
            <a href="/signup">Create an account</a>
            <a href="#features">Daily habits</a>
            <a href="#features">Weekly progress</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Habit Tracker. All rights reserved.</span>
          <span>Made for a better you. ✳</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
