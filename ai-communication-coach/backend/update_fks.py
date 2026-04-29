import glob
import os

files = glob.glob('app/models/*.py')
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    new_content = content.replace('ForeignKey("sessions.id")', 'ForeignKey("sessions.id", ondelete="CASCADE")')
    new_content = new_content.replace('ForeignKey("users.id")', 'ForeignKey("users.id", ondelete="CASCADE")')
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Updated {f}")
