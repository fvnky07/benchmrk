import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval('group sweep', { minutes: 1 }, internal.groupSweeps.sweep, {});

export default crons;
