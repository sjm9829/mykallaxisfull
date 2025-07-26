"use client";
import dynamic from 'next/dynamic';

const CollectionClientPage = dynamic(() => import('./CollectionClientPage'), { ssr: false });

export default function CollectionPage() {
    return <CollectionClientPage />;
}