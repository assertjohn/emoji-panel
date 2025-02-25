<!-- webviews/components/EmojiSidebar.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { tsvscode } from '../vscode';
  import emojiData from '../data/emoji.json';
  import { ClipboardCheck } from 'lucide-svelte';

  // Define our emoji type.
  interface Emoji {
    emoji: string;
    description: string;
    category: string;
    aliases: string[];
    tags: string[];
    unicode_version: string;
    ios_version: string;
    skin_tones?: boolean;
  }

  // Live search term.
  let searchTerm = '';

  // Recently used emojis (track up to 50)
  let recentEmojis: Emoji[] = [];

  // Group the flat emoji array by category.
  $: groupedCategories = groupByCategory(emojiData as Emoji[]);
  function groupByCategory(emojis: Emoji[]): { category: string; emojis: Emoji[] }[] {
    const groups: { [key: string]: Emoji[] } = {};
    for (const emoji of emojis) {
      if (!groups[emoji.category]) {
        groups[emoji.category] = [];
      }
      groups[emoji.category].push(emoji);
    }
    return Object.keys(groups).map(category => ({
      category,
      emojis: groups[category]
    }));
  }

  // Returns true if the emoji matches the search term.
  function matchesSearch(emoji: Emoji, term: string): boolean {
    term = term.toLowerCase();
    return (
      emoji.description.toLowerCase().includes(term) ||
      emoji.aliases.some(a => a.toLowerCase().includes(term)) ||
      emoji.tags.some(tag => tag.toLowerCase().includes(term)) ||
      emoji.category.toLowerCase().includes(term)
    );
  }

  // Filtered recent list (no slicing here; CSS will clip to 2 rows)
  $: filteredRecent = recentEmojis.filter(e => !searchTerm || matchesSearch(e, searchTerm));
    
  $: filteredCategories = groupedCategories
    .map(group => {
      const filtered = group.emojis.filter(e => !searchTerm || matchesSearch(e, searchTerm));
      return { category: group.category, emojis: filtered };
    })
    .filter(group => group.emojis.length > 0);

  // Request recent emojis on mount.
  onMount(() => {
    tsvscode.postMessage({ type: 'requestRecentEmojis' });
    window.addEventListener('message', (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'recentEmojis') {
        // Create minimal Emoji objects for the recent list.
        recentEmojis = message.recentEmojis.map((sym: string) => ({
          emoji: sym,
          description: sym,
          category: '',
          aliases: [],
          tags: [],
          unicode_version: '',
          ios_version: ''
        }));
      }
    });
  });

  // Maintain separate copy–animation states for recent and catalogue.
  let copiedRecent: Record<string, boolean> = {};
  let copiedCatalogue: Record<string, boolean> = {};

  function emojiClicked(emoji: Emoji, section: 'recent' | 'catalog') {
    tsvscode.postMessage({ type: 'emojiSelected', emoji: emoji.emoji });
    // Update the recent list and track up to 50 items.
    recentEmojis = [emoji, ...recentEmojis.filter(e => e.emoji !== emoji.emoji)].slice(0,50);
    
    if (section === 'recent') {
      copiedRecent[emoji.emoji] = true;
      copiedRecent = { ...copiedRecent };
      setTimeout(() => {
        copiedRecent[emoji.emoji] = false;
        copiedRecent = { ...copiedRecent };
      }, 1000);
    } else {
      copiedCatalogue[emoji.emoji] = true;
      copiedCatalogue = { ...copiedCatalogue };
      setTimeout(() => {
        copiedCatalogue[emoji.emoji] = false;
        copiedCatalogue = { ...copiedCatalogue };
      }, 1000);
    }
  }
</script>

<style>
  /* Global styling */
  :global(body) {
    padding: 0;
    margin: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background-color: var(--vscode-sideBar-background);
    border-top: 1px solid var(--vscode-sideBar-border);
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--vscode-sideBar-background);
    color: var(--vscode-sideBar-foreground);
    padding: 0px;
  }
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--vscode-sideBar-background);
    padding: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--vscode-sideBar-border);
  }
  .search-input {
    width: 100%;
    padding: 8px;
    font-size: 14px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    box-sizing: border-box;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
  }
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }
  /* Subtle custom scrollbar */
  .content::-webkit-scrollbar {
    width: 4px;
  }
  .content::-webkit-scrollbar-track {
    background: transparent;
  }
  .content::-webkit-scrollbar-thumb {
    background-color: var(--vscode-scrollbarSlider-background);
    border-radius: 2px;
  }
  .content {
    scrollbar-width: thin;
  }
  /* Section and grid styling */
  .section {
    margin-bottom: 16px;
  }
  .section-title {
    font-weight: bold;
    margin-bottom: 8px;
    padding: 0 4px;
  }
  .emoji-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    gap: 4px;
    padding: 0 4px;
  }
  .emoji-item {
    position: relative;
    font-size: 24px;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    text-align: center;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .emoji-item:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  /* Copy overlay with custom animation */
  .copy-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #5cb85c;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    pointer-events: none;
    animation: flash 1s forwards;
  }
  @keyframes flash {
    0% { opacity: 0; }
    10% { opacity: 1; }
    60% { opacity: 1; }
    100% { opacity: 0; }
  }
  /* Recently used panel fixed at the bottom */
  .recent-panel {
    border-top: 1px solid var(--vscode-editorWidget-border);
    padding: 4px;
    padding-top: 12px;
    margin-bottom: 12px;
    background-color: var(--vscode-sideBar-background);
  }
  .recent-emoji-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    gap: 4px;
    padding: 0 4px;
    max-height: calc(2 * 42px + 4px);
    overflow: hidden;
  }
</style>

<div class="sidebar">
  <!-- Fixed header with search bar -->
  <div class="header">
    <input
      class="search-input"
      type="text"
      bind:value={searchTerm}
      placeholder="Search emojis..."
    />
  </div>
  <!-- Scrollable content: Main catalogue -->
  <div class="content">
    {#each filteredCategories as group (group.category)}
      <div class="section">
        <div class="section-title">{group.category}</div>
        <div class="emoji-list">
          {#each group.emojis as emoji (emoji.emoji)}
            <div class="emoji-item" on:click={() => emojiClicked(emoji, 'catalog')} title={emoji.description}>
              {emoji.emoji}
              {#if copiedCatalogue[emoji.emoji]}
                <div class="copy-overlay">
                  <ClipboardCheck stroke="#ffffff" size="24" />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <!-- Fixed Recently Used panel at the bottom -->
  {#if filteredRecent.length > 0}
    <div class="recent-panel">
      <div class="section-title">Recently Used</div>
      <div class="recent-emoji-grid">
        {#each filteredRecent as emoji (emoji.emoji)}
          <div class="emoji-item" on:click={() => emojiClicked(emoji, 'recent')} title={emoji.description}>
            {emoji.emoji}
            {#if copiedRecent[emoji.emoji]}
              <div class="copy-overlay">
                <ClipboardCheck stroke="#ffffff" size="24" />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
