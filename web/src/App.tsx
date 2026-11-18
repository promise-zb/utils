import type { ComponentType } from 'react'
import { tools, type ToolId } from '@local/shared'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import FloorAreaPage from '@local/floor-area/web'
import SignPage from '@local/sign/web'
import Home from './Home'

const pages: Record<ToolId, ComponentType> = {
  'floor-area': FloorAreaPage,
  sign: SignPage,
}

function ToolNav() {
  return (
    <nav className="tool-nav">
      <NavLink to="/" end>
        工具
      </NavLink>
      {tools.map((tool) => (
        <NavLink key={tool.id} to={tool.path}>
          {tool.name}
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToolNav />
      <Routes>
        <Route path="/" element={<Home />} />
        {tools.map((tool) => {
          const Page = pages[tool.id]
          return <Route key={tool.id} path={tool.path} element={<Page />} />
        })}
      </Routes>
    </BrowserRouter>
  )
}
