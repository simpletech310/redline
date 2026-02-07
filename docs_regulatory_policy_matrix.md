# Redline Regulatory Policy Matrix (Demo)

> **Counsel engagement requirement:** Product, compliance, and engineering must engage licensed gaming counsel in each operating jurisdiction before enabling paid picks in production. This matrix is an implementation baseline, not legal advice.

| Region Code | State/Country | Skill-Game Allowed | DFS Carveout | Restricted Location | KYC + Age Threshold | Notes |
|---|---|---:|---:|---:|---|---|
| US-CA | California, USA | Yes | Yes | No | KYC required, 18+ | Demo-friendly regulated market. |
| US-NY | New York, USA | Yes | Yes | No | KYC required, 21+ | DFS-style contest framing required. |
| US-WA | Washington, USA | No | No | Yes | KYC required, 21+ | Real-money picks blocked. |
| US-ID | Idaho, USA | No | No | Yes | KYC required, 21+ | Restricted for paid skill contests. |
| CA-ON | Ontario, Canada | Yes | Yes | No | KYC required, 19+ | Provincial oversight required. |
| IN | India | Yes | Yes | No | KYC required, 18+ | Subject to state-by-state treatment. |
| BR | Brazil | Yes | No | No | KYC required, 18+ | Cash-pick structure requires local legal review. |
| AE | United Arab Emirates | No | No | Yes | KYC required, 21+ | Restricted jurisdiction for this product. |

## Control mapping to product endpoints

- **Account creation:** geolocation + age threshold validation against policy matrix.
- **Deposit:** blocked for restricted/unsupported regions, age and KYC enforced.
- **Pick placement:** blocked for restricted regions; feature flags can disable pick type by region without redeploy.
- **Withdrawal:** blocked for restricted/unsupported regions, age and KYC enforced.

