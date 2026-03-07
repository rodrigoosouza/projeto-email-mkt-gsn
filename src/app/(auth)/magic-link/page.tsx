import Link from 'next/link'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function MagicLinkPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Link Enviado!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">
          Verifique seu email. Enviamos um link de acesso para voce entrar na plataforma.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-primary hover:underline font-medium text-sm">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  )
}
