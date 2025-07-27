
import { render, screen } from '@testing-library/react';
import { AlbumCard } from '../album-card';
import type { Album } from '@/types/album';

const mockAlbum: Album = {
  id: '1',
  artist: 'Test Artist',
  title: 'Test Album',
  type: 'Vinyl',
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('AlbumCard', () => {
  it('renders album information correctly', () => {
    render(<AlbumCard album={mockAlbum} onClick={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });
});
