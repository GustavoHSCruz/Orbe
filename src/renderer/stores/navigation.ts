import { create } from 'zustand'

export type Page =
  | 'home'
  | 'downloads'
  | 'history'
  | 'library'
  | 'playlists'
  | 'youtube-playlists'
  | 'spotify'
  | 'integrations'
  | 'converter'
  | 'settings'

type NavigationState = {
  page: Page
  draftUrl: string | null
  downloadDialogOpen: boolean
  librarySearch: string
  libraryFilter: 'all' | 'audio' | 'video' | 'favorite'
  setLibrarySearch: (search: string) => void
  setLibraryFilter: (filter: 'all' | 'audio' | 'video' | 'favorite') => void
  setPage: (page: Page) => void
  openDownloadDialog: () => void
  closeDownloadDialog: () => void
  openMediaUrl: (url: string) => void
  clearDraftUrl: () => void
}

export const useNavigation = create<NavigationState>((set) => ({
  page: 'home',
  draftUrl: null,
  downloadDialogOpen: false,
  librarySearch: '',
  libraryFilter: 'all',
  setLibrarySearch: (librarySearch) => set({ librarySearch, page: 'library' }),
  setLibraryFilter: (libraryFilter) => set({ libraryFilter }),
  setPage: (page) => set({ page }),
  openDownloadDialog: () => set({ downloadDialogOpen: true }),
  closeDownloadDialog: () => set({ downloadDialogOpen: false }),
  openMediaUrl: (draftUrl) => set({ page: 'home', draftUrl }),
  clearDraftUrl: () => set({ draftUrl: null }),
}))
