import { getKinshipColumns } from './scripts/utils/kinshipUtils.js';

const mockContext = {
    _indexes: {
        basic: new Map([
            ['1', { id: '1', name: 'User', gender: 'm' }],
            ['2', { id: '2', name: 'Father', gender: 'm' }],
            ['3', { id: '3', name: 'Mother', gender: 'f' }],
            ['4', { id: '4', name: 'GF 1', gender: 'm' }],
            ['5', { id: '5', name: 'GM 1', gender: 'f' }],
            ['6', { id: '6', name: 'GF 2', gender: 'm' }],
            ['7', { id: '7', name: 'GM 2', gender: 'f' }],
            ['8', { id: '8', name: 'GGF 1', gender: 'm' }]
        ])
    },
    db: {
        familyRoles: [
            { familyId: 'f1', personId: '1', roleId: 'child' },
            { familyId: 'f1', personId: '2', roleId: 'husband' },
            { familyId: 'f1', personId: '3', roleId: 'wife' },
            { familyId: 'f2', personId: '2', roleId: 'child' },
            { familyId: 'f2', personId: '4', roleId: 'husband' },
            { familyId: 'f2', personId: '5', roleId: 'wife' },
            { familyId: 'f3', personId: '3', roleId: 'child' },
            { familyId: 'f3', personId: '6', roleId: 'husband' },
            { familyId: 'f3', personId: '7', roleId: 'wife' },
            { familyId: 'f4', personId: '4', roleId: 'child' },
            { familyId: 'f4', personId: '8', roleId: 'husband' }
        ]
    }
};

global.APP_CONFIG = { rootId: '1' };
global.COLUMNS = { basic: { id: 'id', name: 'name', gender: 'gender' } };
global.i18n = { t: () => null };

// We need getParentIds and getSiblings mocked or we just let it run if they are in utils?
// Wait, we can't easily run ES modules if they depend on DOM or other things.
