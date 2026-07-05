/**
 * Tokens visuels pour distinguer les deux types de comptes du système.
 *
 * CLIENT — consommateur de l'application mobile LipaEasyGo
 *   → envoie/reçoit de l'argent, vérifié KYC, utilise un PIN
 *   → couleur : Bleu IBM (#0F62FE)
 *
 * AGENT-TERRAIN — revendeur physique proche des clients
 *   → dépose/retire du cash, gère un float, s'authentifie par mot de passe
 *   → couleur : Ambre (#F59E0B)
 */

export const ACCOUNT_TYPE = {
  user: {
    key:         'user'               as const,
    label:       'Client',
    labelFull:   'Client LipaEasyGo',
    description: 'Consommateur de l\'application mobile — envoie et reçoit de l\'argent',
    color:       '#0F62FE',
    colorLight:  '#EDF5FF',
    colorBorder: '#0F62FE40',
    icon:        '👤',
    antTag:      'blue'              as const,
  },
  agent: {
    key:         'agent'             as const,
    label:       'Agent-Terrain',
    labelFull:   'Agent-Terrain',
    description: 'Revendeur physique — gère un float, dépose et retire du cash pour les clients',
    color:       '#F59E0B',
    colorLight:  '#FEF7E6',
    colorBorder: '#F59E0B40',
    icon:        '🏪',
    antTag:      'orange'            as const,
  },
} as const

export type AccountTypeKey = keyof typeof ACCOUNT_TYPE
