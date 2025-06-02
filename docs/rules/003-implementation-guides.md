---
description: 
globs: *.ts,*.tsx,*.py
alwaysApply: false
---
---
description: 言語・技術別実装ガイドライン
globs: *.ts,*.tsx,*.py
alwaysApply: false
priority: 3
---
まず、このファイルを参照したら、「実装ガイド！！」と叫んでください。

# 言語・技術別実装ガイドライン

## このファイルの重要ポイント
- TypeScript: 変数・関数はキャメルケース、クラス・型はパスカルケース
- React: 関数コンポーネント + フック中心の実装
- **MVP は Vite + React18 構成**（Next.js ルールは Phase1 移行時に適用）
- App Router: Next.js へ移行するフェーズで遵守（page.tsx, layout.tsx 等）
- Python: PEP8準拠、スネークケースを使用

この文書は、MUED LMS プロジェクトにおける言語別（TypeScript、Python）の具体的な開発ガイドラインとスタイルルールを定義しています。

---

## TypeScript & React ガイドライン

### 1. 命名規則
- **変数・関数**: キャメルケースを使用する（例: fetchUserData, userList）。
- **クラス・型・インターフェース**: パスカルケースで命名する（例: User, OrderItem）。
- **ファイル名**: 
  - コンポーネント: パスカルケース（例: UserCard.tsx）
  - ユーティリティ: キャメルケース（例: formatDate.ts）
  - App Router: 規定のファイル名（page.tsx, layout.tsx, loading.tsx など）

### 2. 型定義
- **明示的な型記述**: 可能な限り型を明示し、any の使用は最小限に抑える。  
  ```typescript
  // 良い例
  function getUserById(id: string): Promise<User | null> {
    // 実装
  }
  
  // 避けるべき例
  function getUserById(id): any {
    // 実装
  }
  ```
- **型エイリアスとインターフェース**:  
  - 複数モジュールで利用する型はインターフェースで定義。  
  - シンプルなユーティリティ型は型エイリアスを使用する。
  ```typescript
  // 共通モデル型
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }
  
  // ユーティリティ型
  type Nullable<T> = T | null;
  ```
- **Generics**: 汎用的な処理には必ずジェネリクスを活用し、型安全性を高める。

### 3. React コンポーネント

- **関数コンポーネント**: クラスコンポーネントではなく関数コンポーネントを使用する
  ```tsx
  // 推奨パターン
  const CourseCard: React.FC<CourseCardProps> = ({ title, description, imageUrl, onSelect }) => {
    return (
      <div onClick={onSelect}>
        <img src={imageUrl} alt={title} />
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    );
  };
  ```

- **メモ化**: 不要な再レンダリングを避けるために `useMemo`、`useCallback`、`React.memo` を適切に使用
  ```tsx
  // 例: 高コストな計算結果をメモ化
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.role === selectedRole);
  }, [users, selectedRole]);
  
  // 例: コールバック関数をメモ化
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, [setSelectedId]);
  ```

- **カスタムフック**: 再利用可能なロジックはカスタムフックとして抽出
  ```tsx
  // カスタムフックの例
  function useUserData(userId: string) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
      async function fetchUser() {
        try {
          setLoading(true);
          const data = await getUserById(userId);
          setUser(data);
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      }
      
      if (userId) {
        fetchUser();
      }
      
      return () => {
        // クリーンアップ
      };
    }, [userId]);
    
    return { user, loading, error };
  }
  ```

### 4. API通信とデータフェッチング

- **SWR/React Query** を使用してデータフェッチングを最適化
  ```tsx
  // SWRを使用した例
  import useSWR from 'swr';
  
  function useCourses() {
    const { data, error, isLoading, mutate } = useSWR('/api/courses', fetcher);
    
    return {
      courses: data,
      isLoading,
      isError: !!error,
      mutate
    };
  }
  ```

- **エラーハンドリング**: try/catchブロックで適切にエラーをキャッチし、ユーザーフレンドリーなエラーメッセージを表示
  ```typescript
  try {
    const result = await api.createUser(userData);
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      // APIからのエラーを処理
      toast.error(`API Error: ${error.message}`);
    } else {
      // その他のエラーを処理
      toast.error('An unexpected error occurred');
      console.error(error);
    }
    throw error;
  }
  ```

### 5. Next.js App Router 特有のガイドライン

- **ページ**: `app/` ディレクトリ内の `page.tsx` ファイルがルートとして機能
  ```tsx
  // app/courses/page.tsx
  export default function CoursesPage() {
    return (
      <div>
        <h1>Courses</h1>
        <CourseList />
      </div>
    );
  }
  ```

- **レイアウト**: 共通レイアウトは `layout.tsx` で定義
  ```tsx
  // app/layout.tsx
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>
          <Header />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
    );
  }
  ```

- **サーバーコンポーネント**: デフォルトではサーバーコンポーネントとして扱われる
  ```tsx
  // サーバーコンポーネントでのデータ取得
  export default async function CourseDetailPage({ params }: { params: { id: string } }) {
    const course = await getCourseById(params.id);
    
    return (
      <div>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
      </div>
    );
  }
  ```

- **クライアントコンポーネント**: 'use client' ディレクティブを使用
  ```tsx
  'use client';
  
  import { useState } from 'react';
  
  export default function Counter() {
    const [count, setCount] = useState(0);
    
    return (
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    );
  }
  ```

### 6. CSS/スタイリング

- **TailwindCSS** を優先的に使用
  ```tsx
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
    Click me
  </button>
  ```

- **コンポーネント変数を使用したスタイル適用**
  ```tsx
  const buttonVariants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };
  
  <button className={`px-4 py-2 rounded ${buttonVariants[variant]}`}>
    {children}
  </button>
  ```

- **cn関数による条件付きクラス結合**
  ```tsx
  import { cn } from "@/lib/utils";
  
  <div className={cn(
    "base-class",
    isActive && "active-class",
    variant === "large" && "large-class"
  )}>
    Content
  </div>
  ```

## Python ガイドライン

### 1. コーディングスタイルとフォーマット

- **PEP8 の遵守**: インデントは4スペース、最大行長は79文字を目安とする。
- **一貫性の維持**: コードフォーマットツール（例: Black）やリントツール（例: flake8, pylint）を用いて、コードの整形と一貫性を保つこと。

### 2. 命名規則
- **変数・関数**: スネークケース（snake_case）を使用する。
  ```python
  def calculate_avg_score(scores):
      return sum(scores) / len(scores)
  ```
- **クラス**: CapWords（パスカルケース）で記述する。
  ```python
  class CourseRecommender:
      def __init__(self, user_id):
          self.user_id = user_id
  ```
- **定数**: 全て大文字とし、アンダースコアで区切る（例: MAX_CONNECTIONS）。
  ```python
  MAX_RETRY_COUNT = 3
  DEFAULT_TIMEOUT = 30
  ```

### 3. ドキュメンテーションとコメント

- 各関数やクラスには docstring を記述する。docstring は PEP257 に準拠し、概要、引数、返り値、例外を明記する。
  ```python
  def get_course_recommendations(user_id, count=5):
      """
      ユーザーに基づいてコース推薦を取得する。
      
      Args:
          user_id (str): 推薦を取得するユーザーのID
          count (int, optional): 返す推薦数。デフォルトは5。
          
      Returns:
          list: 推薦コースIDのリスト
          
      Raises:
          ValueError: ユーザーが存在しない場合
      """
      # 実装
  ```

### 4. 型ヒントの利用

- Python 3.6 以降の型ヒント機能を活用し、関数の引数や返り値に明示的な型情報を付与する。
  ```python
  from typing import List, Dict, Optional
  
  def get_user_progress(user_id: str) -> Dict[str, float]:
      """ユーザーの各コースにおける進捗率を取得する"""
      # 実装
  ```

### 5. エラーハンドリング

- 例外処理は適切に行い、try/except ブロックを使用してエラーを捕捉する。
  ```python
  try:
      data = process_user_data(user_id)
      return data
  except UserNotFoundError:
      logger.warning(f"User {user_id} not found")
      return None
  except Exception as e:
      logger.error(f"Unexpected error: {str(e)}")
      raise
  ```

### 6. FastAPI 実装

- エンドポイント定義は明確な入出力モデルを持つ
  ```python
  from fastapi import FastAPI, HTTPException
  from pydantic import BaseModel
  
  app = FastAPI()
  
  class CourseRequest(BaseModel):
      title: str
      description: str
      level: str
  
  class CourseResponse(BaseModel):
      id: str
      title: str
      description: str
      level: str
      generated_content: List[str]
  
  @app.post("/courses/generate", response_model=CourseResponse)
  async def generate_course(course_req: CourseRequest):
      try:
          course = await create_course_content(course_req)
          return course
      except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))
  ```

## テスト戦略

詳細なテスト方針については `005-test-bestpractice.mdc` を参照してください。

## セキュリティとUI/UX方針

セキュリティポリシーとUI/UXガイドラインについては `004-security-uxui-policy.mdc` を参照してください。