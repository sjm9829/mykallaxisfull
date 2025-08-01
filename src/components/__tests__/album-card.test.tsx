import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlbumCard } from '../album-card';
import type { Album } from '@/types/album';
import { getPrimaryCoverImage } from '@/lib/album-images';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} data-testid="mock-image" />;
  };
});

// Mock album images utility
jest.mock('@/lib/album-images', () => ({
  getPrimaryCoverImage: jest.fn(),
}));

const mockGetPrimaryCoverImage = getPrimaryCoverImage as jest.MockedFunction<typeof getPrimaryCoverImage>;

const mockAlbum: Album = {
  id: '1',
  artist: 'Test Artist',
  title: 'Test Album',
  type: 'Vinyl',
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  releaseDate: '2024',
  coverImageUrl: 'https://example.com/cover.jpg',
};

const mockFavoriteAlbum: Album = {
  ...mockAlbum,
  id: '2',
  isFavorite: true,
};

describe('AlbumCard', () => {
  const mockOnClick = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrimaryCoverImage.mockReturnValue('https://example.com/cover.jpg');
  });

  it('renders album information correctly', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('shows favorite star for favorite albums', () => {
    render(<AlbumCard album={mockFavoriteAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const starIcon = screen.getByRole('button', { name: /test album 상세 보기/i }).querySelector('svg');
    expect(starIcon).toBeInTheDocument();
  });

  it('does not show favorite star for non-favorite albums', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const cardButton = screen.getByRole('button', { name: /test album 상세 보기/i });
    const starIcon = cardButton.querySelector('.text-yellow-400');
    expect(starIcon).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const card = screen.getByRole('button', { name: /test album 상세 보기/i });
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith();
  });

  it('calls onClick when Enter key is pressed', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const card = screen.getByRole('button', { name: /test album 상세 보기/i });
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledWith();
  });

  it('calls onClick when Space key is pressed', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const card = screen.getByRole('button', { name: /test album 상세 보기/i });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockOnClick).toHaveBeenCalledWith();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /앨범 삭제/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith();
    expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
  });

  it('shows loading state for images', async () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    // Initially should show loading state (pulse animation)
    const imageContainer = screen.getByText('Test Album').closest('.min-h-\\[200px\\]');
    expect(imageContainer).toBeInTheDocument();
  });

  it('shows "No Image" when no cover image is available', () => {
    mockGetPrimaryCoverImage.mockReturnValue(null);

    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('handles image loading error gracefully', async () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const image = screen.getByAltText('Test Album');
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText('No Image')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<AlbumCard album={mockAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const card = screen.getByRole('button', { name: /test album 상세 보기/i });
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'Test Album 상세 보기');

    const deleteButton = screen.getByRole('button', { name: /앨범 삭제/i });
    expect(deleteButton).toHaveAttribute('aria-label', '앨범 삭제');
    expect(deleteButton).toHaveAttribute('tabIndex', '0');
  });

  it('shows title and artist with proper truncation', () => {
    const longTitleAlbum: Album = {
      ...mockAlbum,
      title: 'This is a very long album title that should be truncated',
      artist: 'This is a very long artist name that should also be truncated',
    };

    render(<AlbumCard album={longTitleAlbum} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const titleElement = screen.getByText(longTitleAlbum.title);
    const artistElement = screen.getByText(longTitleAlbum.artist);

    expect(titleElement).toHaveClass('truncate');
    expect(artistElement).toHaveClass('truncate');
    expect(titleElement).toHaveAttribute('title', longTitleAlbum.title);
    expect(artistElement).toHaveAttribute('title', longTitleAlbum.artist);
  });
});
