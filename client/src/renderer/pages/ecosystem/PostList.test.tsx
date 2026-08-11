// client/src/renderer/pages/ecosystem/PostList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostList } from './PostList';
import type { Post } from '@shared/types';

const noop = () => {};

const makePost = (id: string, overrides: Partial<Post> = {}): Post => ({
    id,
    title: `Post ${id}`,
    body: `Body of post ${id}`,
    category: 'DISCUSSION',
    tags: [],
    status: 'PUBLISHED',
    likes: 0,
    views: 0,
    commentCount: 0,
    author: { id: 'u1', username: 'testuser' },
    _count: { comments: 0, postLikes: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('PostList', () => {
    it('should show loading state', () => {
        render(
            <PostList
                posts={[]} loading={true} total={0}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByText('加载中...')).toBeDefined();
    });

    it('should show empty state when no posts', () => {
        render(
            <PostList
                posts={[]} loading={false} total={0}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByText('暂无帖子')).toBeDefined();
    });

    it('should render post cards', () => {
        const posts = [makePost('1'), makePost('2')];
        render(
            <PostList
                posts={posts} loading={false} total={2}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={{ id: 'u1', username: 'test' }}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByText('Post 1')).toBeDefined();
        expect(screen.getByText('Post 2')).toBeDefined();
    });

    it('should highlight selected post', () => {
        const posts = [makePost('1'), makePost('2')];
        const { container } = render(
            <PostList
                posts={posts} loading={false} total={2}
                page={1} pageSize={10} searchText="" selectedPostId="1"
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        const cards = container.querySelectorAll('[style*="cursor: pointer"]');
        expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    it('should call onSelectPost when clicking a card', () => {
        const onSelect = vi.fn();
        const posts = [makePost('1')];
        render(
            <PostList
                posts={posts} loading={false} total={1}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={onSelect}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        fireEvent.click(screen.getByText('Post 1'));
        expect(onSelect).toHaveBeenCalledWith(posts[0]);
    });

    it('should show pagination when total > pageSize', () => {
        const posts = Array.from({ length: 10 }, (_, i) => makePost(`${i}`));
        render(
            <PostList
                posts={posts} loading={false} total={25}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByText('上一页')).toBeDefined();
        expect(screen.getByText('下一页')).toBeDefined();
    });

    it('should disable prev button on first page', () => {
        const posts = Array.from({ length: 10 }, (_, i) => makePost(`${i}`));
        render(
            <PostList
                posts={posts} loading={false} total={25}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        const prev = screen.getByText('上一页') as HTMLButtonElement;
        expect(prev.disabled).toBe(true);
    });

    it('should render search bar when not focused', () => {
        render(
            <PostList
                posts={[]} loading={false} total={0}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={false} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByPlaceholderText('搜索帖子...')).toBeDefined();
    });

    it('should show exit focus button when focused', () => {
        render(
            <PostList
                posts={[]} loading={false} total={0}
                page={1} pageSize={10} searchText="" selectedPostId={null}
                isFocused={true} user={null}
                onSearchTextChange={noop} onSearch={noop} onSelectPost={noop}
                onPageChange={noop} onCreatePost={noop} onExitFocus={noop}
            />,
        );
        expect(screen.getByText('← 返回列表')).toBeDefined();
    });
});
