# Architecture

React frontend → Express backend → MySQL database via Prisma.  
Express backend also calls Python FastAPI ML service for rubber sheet image prediction.

Workflow: Tapper submission → Estate owner approval/rejection → Factory ML suggestion → Factory final grade → Payment calculation → Revenue sharing → Inventory update → Reports.
