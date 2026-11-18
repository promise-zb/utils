import type { ComponentType } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { tools, type ToolId } from '@local/shared'
import FloorAreaScreen from '@local/floor-area/app'
import SignScreen from '@local/sign/app'
import Home from './src/Home'
import type { RootStack } from './src/routes'

const Stack = createNativeStackNavigator<RootStack>()

const pages: Record<ToolId, ComponentType> = {
  'floor-area': FloorAreaScreen,
  sign: SignScreen,
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} options={{ title: '工具' }} />
        {tools.map((tool) => (
          <Stack.Screen
            key={tool.id}
            name={tool.id}
            component={pages[tool.id]}
            options={{ title: tool.name }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
