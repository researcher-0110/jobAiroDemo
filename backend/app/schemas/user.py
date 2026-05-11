from pydantic import BaseModel
from typing import Optional

class UserOut(BaseModel):
    id: str
    email: str
    role: Optional[str] = None
