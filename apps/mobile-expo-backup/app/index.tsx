import { Redirect } from 'expo-router';

export default function RootScreen() {
  console.log('Index screen - redirecting to test');
  
  // テストページにリダイレクト
  return <Redirect href="/test" />;
}