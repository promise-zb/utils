import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { tools } from '@local/shared'
import type { RootStack } from './routes'

export default function Home({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  return (
    <View style={styles.page}>
      {tools.map((tool) => (
        <Pressable key={tool.id} style={styles.card} onPress={() => navigation.navigate(tool.id)}>
          <Text style={styles.name}>{tool.name}</Text>
          <Text style={styles.summary}>{tool.summary}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12, backgroundColor: '#f5f6f8' },
  card: { padding: 16, borderRadius: 8, backgroundColor: '#fff' },
  name: { fontSize: 16, fontWeight: '600' },
  summary: { marginTop: 4, color: '#666' },
})
