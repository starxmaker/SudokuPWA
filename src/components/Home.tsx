import React from 'react'
import { FaGithub } from 'react-icons/fa'

declare const __APP_VERSION__: string
declare const __REPO_URL__: string

type Props = {
  hasSaved: boolean
  onNew: () => void
  onContinue: () => void
  error?: string | null
}

export default function Home({ hasSaved, onNew, onContinue, error }: Props){
  return (
    <div style={{padding:20,display:'flex',flexDirection:'column',alignItems:'center',gap:12,minHeight:'calc(100vh - 72px)'}}>
      <div style={{width:'100%',maxWidth:720,textAlign:'center'}}>
        <h2 style={{margin:0,paddingTop:'6vh'}}>Welcome</h2>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20,alignItems:'stretch',width:'100%',maxWidth:240}}>
          <button onClick={onNew}>New Game</button>
          {hasSaved && <button onClick={onContinue}>Continue</button>}
        </div>
      </div>
      {error && <p style={{color:'#e53935',fontWeight:600}}>{error}</p>}
      {!hasSaved && !error && <p style={{color:'#666'}}>No saved game found — start a new puzzle.</p>}
      <a
        href={__REPO_URL__}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on GitHub"
        style={{color:'#999',display:'flex',alignItems:'center',textDecoration:'none'}}
      >
        <FaGithub size={36} />
      </a>
      <p style={{color:'#999',fontSize:'0.75rem',margin:0}}>v{__APP_VERSION__}</p>
    </div>
  )
}
