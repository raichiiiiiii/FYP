import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { FieldValues, Resolver, UseFormProps } from 'react-hook-form'
import type { z } from 'zod'

export function useValidatedForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>,
) {
  return useForm<z.infer<TSchema>>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(schema as never) as Resolver<z.infer<TSchema>>,
    ...options,
  })
}

export type FormValues<TSchema extends z.ZodType<FieldValues>> = z.infer<TSchema>
