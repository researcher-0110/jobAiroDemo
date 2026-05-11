from fastapi import APIRouter, Depends
from app.schemas.user import UserOut
from app.api.deps import get_current_user
from app.core.supabase import get_supabase

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["sub"],
        email=current_user.get("email", ""),
        role=current_user.get("app_metadata", {}).get("role"),
    )

@router.delete("/me", status_code=204)
async def delete_me(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    sb.auth.admin.delete_user(current_user["sub"])
