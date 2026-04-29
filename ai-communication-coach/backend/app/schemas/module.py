from pydantic import BaseModel


class SubmoduleItem(BaseModel):
    name: str
    description: str


class ModuleResponse(BaseModel):
    id: str
    name: str
    description: str
    submodules: list[SubmoduleItem]
