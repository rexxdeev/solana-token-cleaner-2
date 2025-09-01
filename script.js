const { Connection, PublicKey, clusterApiUrl } = solanaWeb3;
const { getAccount, getMint, TOKEN_PROGRAM_ID } = splToken;

const connectButton = document.getElementById('connectButton');
const walletAddressDisplay = document.getElementById('walletAddress');
const tokenList = document.getElementById('tokenList');
const closeableAccounts = document.getElementById('closeableAccounts');
const reclaimableSol = document.getElementById('reclaimableSol');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

let walletPublicKey = null;

connectButton.onclick = async () => {
  if (!window.solana || !window.solana.isPhantom) {
    alert('Please install the Phantom Wallet.');
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletPublicKey = new PublicKey(resp.publicKey.toString());
    walletAddressDisplay.innerText = `Connected: ${walletPublicKey.toBase58()}`;
    await loadTokens();
  } catch (err) {
    console.error('Wallet connection error:', err);
  }
};

async function loadTokens() {
  tokenList.innerHTML = '';
  closeableAccounts.innerHTML = '';
  reclaimableSol.innerText = '';

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  let reclaimableLamports = 0;

  for (let { pubkey, account } of tokenAccounts.value) {
    const info = account.data.parsed.info;
    const tokenAmount = info.tokenAmount;
    const mint = info.mint;
    const balance = tokenAmount.uiAmount;
    const decimals = tokenAmount.decimals;

    // Fetch token metadata (optional, fallback to mint address)
    let name = 'Unknown Token';
    try {
      const mintPubkey = new PublicKey(mint);
      const mintInfo = await getMint(connection, mintPubkey);
      name = `Token (${mint.slice(0, 4)}...)`;
    } catch {}

    // Display balance
    const tokenDiv = document.createElement('div');
    tokenDiv.className = 'token';
    tokenDiv.innerHTML = `
      <strong>${name}</strong><br/>
      Mint: ${mint}<br/>
      Balance: ${balance}
    `;
    tokenList.appendChild(tokenDiv);

    // Check if closeable
    if (parseFloat(balance) === 0) {
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (accountInfo) {
        reclaimableLamports += accountInfo.lamports;

        const li = document.createElement('li');
        li.innerText = `Account ${pubkey.toBase58()} — ${accountInfo.lamports} lamports`;
        closeableAccounts.appendChild(li);
      }
    }
  }

  if (reclaimableLamports > 0) {
    const sol = reclaimableLamports / 1e9;
    reclaimableSol.innerText = `Estimated reclaimable: ${sol.toFixed(6)} SOL (${reclaimableLamports} lamports)`;
  } else {
    reclaimableSol.innerText = `No closeable accounts detected.`;
  }
}
