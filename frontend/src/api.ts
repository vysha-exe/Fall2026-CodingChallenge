export type User = {
  id: string
  username: string
  email: string
  createdAt: string
}

export type Collaborator = {
  id: string
  userId: string
  username: string
  role: string
  createdAt: string
}

export type CollectionSummary = {
  id: string
  name: string
  description: string
  isPublic: boolean
  shareToken: string | null
  shareUrl: string | null
  imageCount: number
  ownerId?: string | null
  ownerUsername?: string | null
  role?: 'owner' | 'collaborator'
  createdAt: string
  updatedAt: string
}

export type SavedImage = {
  id: string
  collectionId: string
  pixabayId: number | null
  url: string
  previewUrl: string
  title: string
  tags: string
  photographer: string
  pageUrl: string
  note: string
  createdAt: string
}

export type CollectionDetail = Omit<CollectionSummary, 'imageCount'> & {
  images: SavedImage[]
  collaborators?: Collaborator[]
  collaborative?: boolean
  canEdit?: boolean
}

export type SearchHit = {
  pixabayId: number
  url: string
  previewUrl: string
  title: string
  tags: string
  photographer: string
  pageUrl: string
  width?: number
  height?: number
}

export type Friend = {
  id: string
  username: string
  email: string
  requestId: string
  friendsSince: string
}

export type FriendRequestIncoming = {
  id: string
  createdAt: string
  from: { id: string; username: string; email: string }
}

export type FriendRequestOutgoing = {
  id: string
  createdAt: string
  to: { id: string; username: string; email: string }
}

export type UserSearchResult = {
  id: string
  username: string
  email: string
  relationship: 'none' | 'friends' | 'outgoing' | 'incoming'
  requestId: string | null
}

const TOKEN_KEY = 'oneplace_token'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
  register: (body: { username: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { login: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  listCollections: () => request<CollectionSummary[]>('/api/collections'),

  getCollection: (id: string) => request<CollectionDetail>(`/api/collections/${id}`),

  createCollection: (body: { name: string; description?: string; isPublic?: boolean }) =>
    request<CollectionDetail>('/api/collections', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCollection: (
    id: string,
    body: Partial<{ name: string; description: string; isPublic: boolean }>
  ) =>
    request<CollectionDetail>(`/api/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteCollection: (id: string) =>
    request<void>(`/api/collections/${id}`, { method: 'DELETE' }),

  addImage: (collectionId: string, body: Partial<SavedImage> & { url: string }) =>
    request<SavedImage>(`/api/collections/${collectionId}/images`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateImage: (
    collectionId: string,
    imageId: string,
    body: Partial<{ title: string; note: string }>
  ) =>
    request<SavedImage>(`/api/collections/${collectionId}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  removeImage: (collectionId: string, imageId: string) =>
    request<void>(`/api/collections/${collectionId}/images/${imageId}`, {
      method: 'DELETE',
    }),

  shareCollection: (id: string) =>
    request<{ shareToken: string; shareUrl: string; collection: CollectionDetail }>(
      `/api/collections/${id}/share`,
      { method: 'POST' }
    ),

  inviteCollaborator: (id: string, username: string) =>
    request<Collaborator>(`/api/collections/${id}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  removeCollaborator: (id: string, userId: string) =>
    request<void>(`/api/collections/${id}/collaborators/${userId}`, {
      method: 'DELETE',
    }),

  getShared: (token: string) => request<CollectionDetail>(`/api/share/${token}`),

  addSharedImage: (token: string, body: Partial<SavedImage> & { url: string }) =>
    request<SavedImage>(`/api/share/${token}/images`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  search: (q: string, page = 1) =>
    request<{ total: number; page: number; perPage: number; results: SearchHit[] }>(
      `/api/search?q=${encodeURIComponent(q)}&page=${page}`
    ),

  listFriends: () => request<Friend[]>('/api/friends'),

  listIncomingRequests: () => request<FriendRequestIncoming[]>('/api/friends/requests'),

  listOutgoingRequests: () =>
    request<FriendRequestOutgoing[]>('/api/friends/requests/outgoing'),

  searchUsers: (q: string) =>
    request<UserSearchResult[]>(`/api/friends/search?q=${encodeURIComponent(q)}`),

  sendFriendRequest: (username: string) =>
    request<{ id: string; status: string; message: string; user: { id: string; username: string } }>(
      '/api/friends/request',
      { method: 'POST', body: JSON.stringify({ username }) }
    ),

  acceptFriendRequest: (id: string) =>
    request<{ id: string; status: string; message: string }>(
      `/api/friends/requests/${id}/accept`,
      { method: 'POST' }
    ),

  rejectFriendRequest: (id: string) =>
    request<{ id: string; status: string }>(`/api/friends/requests/${id}/reject`, {
      method: 'POST',
    }),

  cancelFriendRequest: (id: string) =>
    request<void>(`/api/friends/requests/${id}`, { method: 'DELETE' }),

  removeFriend: (userId: string) =>
    request<void>(`/api/friends/${userId}`, { method: 'DELETE' }),
}
