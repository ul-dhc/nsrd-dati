import ExplorerClient from './explorer-client';

export const dynamic = 'force-static';
export const revalidate = false;

export default function Page() {
  return <ExplorerClient />;
}
