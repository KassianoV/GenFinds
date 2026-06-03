import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

function App(): React.JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">GenFinds</h1>
        <p className="text-muted-foreground">v2.0.0 — shadcn/ui configurado</p>

        <div className="flex gap-2">
          <Button onClick={() => setCount((c) => c + 1)}>Cliques: {count}</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Abrir Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>shadcn/ui funcionando</DialogTitle>
              <DialogDescription>
                Tailwind CSS 4 + shadcn/ui configurados com os tokens GenFinds.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => setCount(0)}>
              Resetar contador
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App
