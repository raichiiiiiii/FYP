import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

import { httpClient } from './http-client'
import type { HttpMethod } from './http-client'

type MutationRequest = {
  path: string
  method: HttpMethod
  body?: Record<string, unknown>
  invalidate?: QueryKey[]
}

export function useApiData() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ path, method, body }: MutationRequest) =>
      httpClient.request<unknown>(path, { method, body }),
    onSuccess: async (_result, request) => {
      await Promise.all(
        (request.invalidate ?? []).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      )
    },
  })

  const fetchQuery = useCallback(
    <T>(queryKey: QueryKey, path: string) =>
      queryClient.fetchQuery({
        queryKey,
        queryFn: () => httpClient.get<T>(path),
      }),
    [queryClient],
  )

  const mutate = useCallback(
    <T>(request: MutationRequest) => mutation.mutateAsync(request) as Promise<T>,
    [mutation],
  )

  return { fetchQuery, mutate }
}
