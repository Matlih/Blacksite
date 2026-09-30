import re

with open('README.md', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace version headers
text = text.replace('VERSION        : v3.0.0', 'VERSION        : v3.1.0')
text = text.replace('BLACKSITE_2.0.0_x64-setup.exe', 'BLACKSITE_3.1.0_x64-setup.exe')
text = text.replace('BLACKSITE_2.0.0_x64_en-US.msi', 'BLACKSITE_3.1.0_x64_en-US.msi')

# Replace Nonce lengths
text = text.replace('"nonce":              "<base64, 12 bytes, random per write>",', '"nonce":              "<base64, 24 bytes, random per write>",')
text = text.replace('"duress_nonce":       "<base64, 12 bytes>",', '"duress_nonce":       "<base64, 24 bytes>",')
text = text.replace('random 96-bit nonce per write.', 'random 192-bit nonce per write.')

# Replace Cipher name
# Using word boundaries to avoid replacing XChaCha with XXChaCha if already run
text = re.sub(r'\bChaCha20-Poly1305\b', 'XChaCha20-Poly1305', text)

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(text)
