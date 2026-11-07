import { useEffect, useRef, useState } from 'react'
import rocky from './assets/rocky/rocky-original.png'
import seismic from './assets/collectibles/seismic-logo.png'
import menuBackground from './assets/backgrounds/main-menu-bg.png'
import './App.css'
import GameCanvas from './components/GameCanvas'

type Screen = 'menu' | 'settings' | 'howto' | 'leaderboard' | 'game'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [music, setMusic] = useState(70)
  const [sound, setSound] = useState(80)
  const [fullscreen, setFullscreen] = useState(false)

  const menuMusicRef = useRef<HTMLAudioElement | null>(null)

  // Main-menu music stays active on Menu, Settings, How To Play and Leaderboard.
  // It pauses as soon as the player enters the game.
  useEffect(() => {
    const menuMusic = menuMusicRef.current
    if (!menuMusic) return

    menuMusic.volume = music / 100

    if (screen !== 'game') {
      void menuMusic.play().catch(() => {
        // Browsers may block autoplay until the player interacts with the page.
      })
    } else {
      menuMusic.pause()
      menuMusic.currentTime = 0
    }

    return () => {
      menuMusic.pause()
    }
  }, [screen])

  // Update the menu music volume immediately when the Music slider changes.
  useEffect(() => {
    if (menuMusicRef.current) {
      menuMusicRef.current.volume = music / 100
    }
  }, [music])

  const goBack = () => setScreen('menu')

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setFullscreen(true)
      } else {
        await document.exitFullscreen()
        setFullscreen(false)
      }
    } catch {
      setFullscreen(false)
    }
  }

  return (
    <main
      className="game-shell"
      onPointerDown={() => {
        // Start menu music after the first user interaction if autoplay was blocked.
        if (screen !== 'game' && menuMusicRef.current?.paused) {
          void menuMusicRef.current.play().catch(() => {})
        }
      }}
    >
      <audio
        ref={menuMusicRef}
        src="/audio/haunted-menu.mp3"
        loop
        preload="auto"
      />

      <div className={`night-sky ${screen === 'game' ? 'game-active' : ''}`}>
        {screen !== 'game' && (
          <img
            src={menuBackground}
            alt=""
            className="menu-background-image"
            draggable={false}
          />
        )}

        {false && screen !== 'menu' && screen !== 'game' && (
          <>
            <div className="stars" />
            <div className="moon">
              <div className="moon-crater crater-one" />
              <div className="moon-crater crater-two" />
              <div className="moon-crater crater-three" />
            </div>
            <div className="bats bat-one">✦</div>
            <div className="bats bat-two">⌁</div>
            <div className="witch">✦</div>
            <div className="haunted-house house-left">
              <div className="house-roof" />
              <div className="house-body">
                <span />
                <span />
                <span />
                <span />
                <div className="house-door" />
              </div>
            </div>
            <div className="haunted-house house-right">
              <div className="house-roof" />
              <div className="house-body">
                <span />
                <span />
                <span />
                <span />
                <div className="house-door" />
              </div>
            </div>
            <div className="tree tree-left"><i /><i /><i /></div>
            <div className="tree tree-right"><i /><i /><i /></div>
            <div className="grave grave-one" />
            <div className="grave grave-two" />
            <div className="grave grave-three" />
            <div className="fog fog-left" />
            <div className="fog fog-right" />
            <div className="ground">
              <div className="grass grass-left" />
              <div className="grass grass-right" />
            </div>
          </>
        )}

        <section className={`game-content screen-${screen}`}>
          {screen === 'menu' && (
            <>
              <header className="game-logo">
                <h1>
                  <span>ROCKY'S</span>
                  <strong>HAUNTED</strong>
                  <span className="escape-title">ESCAPE</span>
                </h1>
                <p className="tagline">A HALLOWEEN ADVENTURE</p>
              </header>

              <nav className="menu-buttons" aria-label="Main menu">
                <button
                  type="button"
                  className="menu-button play-button"
                  onClick={() => setScreen('game')}
                >
                  <span className="play-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="currentColor">
                      <path d="M8 4.5v23L27 16 8 4.5Z" />
                    </svg>
                  </span>
                  PLAY
                </button>

                <button
                  type="button"
                  className="menu-button"
                  onClick={() => setScreen('settings')}
                >
                  <span className="button-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 3h6l1 4a10 10 0 0 1 2.5 1l3.6-1.8 4.2 4.2-1.8 3.6a10 10 0 0 1 0 3L30.3 21l-4.2 4.2-3.6-1.8a10 10 0 0 1-2.5 1l-1 4h-6l-1-4a10 10 0 0 1-2.5-1l-3.6 1.8L1.7 21l1.8-3.6a10 10 0 0 1 0-3L1.7 10.8l4.2-4.2 3.6 1.8a10 10 0 0 1 2.5-1L13 3Z" />
                      <circle cx="16" cy="15.5" r="4.2" />
                    </svg>
                  </span>
                  SETTINGS
                </button>

                <button
                  type="button"
                  className="menu-button"
                  onClick={() => setScreen('leaderboard')}
                >
                  <span className="button-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="currentColor">
                      <path d="M11 3h10v4h6v4c0 5-3.1 8-7.5 8.7A7.2 7.2 0 0 1 17 22v3h6v4H9v-4h6v-3a7.2 7.2 0 0 1-2.5-2.3C8.1 19 5 16 5 11V7h6V3Zm0 8H8v.5c0 2.7 1.3 4.4 3.5 5.2A10 10 0 0 1 11 11Zm10 0a10 10 0 0 1-.5 5.7c2.2-.8 3.5-2.5 3.5-5.2V11h-3Z" />
                    </svg>
                  </span>
                  LEADERBOARD
                </button>

                <button
                  type="button"
                  className="menu-button"
                  onClick={() => setScreen('howto')}
                >
                  <span className="button-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="16" cy="16" r="12.5" />
                      <path d="M16 14v8" />
                      <circle cx="16" cy="9.5" r="1.4" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  HOW TO PLAY
                </button>
              </nav>

              <div className="rocky-area">
                <div className="rocky-name">ROCKY</div>
                <img
                  src={rocky}
                  alt="Rocky original character"
                  className="rocky-character"
                  draggable={false}
                />
              </div>

              <div className="creator-credit">
                <a
                  className="creator-credit__x"
                  href="https://x.com/Bili_6_"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Bili Dz on X"
                  title="Visit @Bili_6_ on X"
                >
                  𝕏
                </a>

                <a
                  className="creator-credit__handle"
                  href="https://x.com/Bili_6_"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open @Bili_6_ on X"
                >
                  @Bili_6_
                </a>
              </div>

              <div className="seismic-brand">
                <img src={seismic} alt="Seismic logo" draggable={false} />
                <span>BUILT FOR THE SEISMIC COMMUNITY</span>
              </div>
            </>
          )}

          {screen === 'settings' && (
            <section className="panel">
              <h2>SETTINGS</h2>
              <div className="setting-row">
                <label htmlFor="music">Music volume</label>
                <input id="music" type="range" min="0" max="100" value={music} onChange={(event) => setMusic(Number(event.target.value))} />
                <span>{music}%</span>
              </div>
              <div className="setting-row">
                <label htmlFor="sound">Sound effects</label>
                <input id="sound" type="range" min="0" max="100" value={sound} onChange={(event) => setSound(Number(event.target.value))} />
                <span>{sound}%</span>
              </div>
              <button type="button" className="menu-button" onClick={toggleFullscreen}>
                {fullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
              </button>
              <button type="button" className="menu-button back-button" onClick={goBack}>← BACK</button>
            </section>
          )}

          {screen === 'howto' && (
            <section className="panel">
              <h2>HOW TO PLAY</h2>
              <div className="instructions">
                <div><strong>← →</strong><span>Move Rocky</span></div>
                <div><strong>SPACE</strong><span>Jump over obstacles</span></div>
                <div><strong>5 × LOGO</strong><span>Collect 5 Seismic logos</span></div>
                <div><strong>KEY</strong><span>Find the exit key</span></div>
                <div><strong>EXIT</strong><span>Unlock the haunted door</span></div>
              </div>
              <p className="panel-note">Avoid ghosts and spikes. You have 3 lives. Good luck!</p>
              <button type="button" className="menu-button back-button" onClick={goBack}>← BACK</button>
            </section>
          )}

          {screen === 'leaderboard' && (
            <section className="panel">
              <h2>LEADERBOARD</h2>
              <div className="empty-board">
                <span className="trophy">♜</span>
                <p>NO RECORDS YET</p>
                <small>Complete the haunted escape to set your record.</small>
              </div>
              <button type="button" className="menu-button back-button" onClick={goBack}>← BACK</button>
            </section>
          )}

          {screen === 'game' && (
            <section className="game-play-screen">
              <GameCanvas
                onExit={goBack}
                soundVolume={sound / 100}
                musicVolume={music / 100}
              />
              <button type="button" className="menu-button back-button exit-game" onClick={goBack}>
                ← MAIN MENU
              </button>
            </section>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
