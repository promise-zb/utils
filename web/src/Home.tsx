import { tools } from '@local/shared'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="home">
      <h1>工具</h1>
      <ul>
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link to={tool.path}>
              <strong>{tool.name}</strong>
              <span>{tool.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
