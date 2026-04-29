"""Cross-database UUID column type.

Uses SQLAlchemy 2.0's built-in Uuid type which works with both
PostgreSQL (native UUID) and SQLite (stored as CHAR(32)).
"""

import uuid

from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column

# Reusable primary key column
def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

# Reusable foreign key factory
def uuid_fk(fk: str, index: bool = True) -> Mapped[uuid.UUID]:
    from sqlalchemy import ForeignKey
    return mapped_column(Uuid(as_uuid=True), ForeignKey(fk), index=index, nullable=False)
