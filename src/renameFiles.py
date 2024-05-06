import os

def rename_files(dir):
    for filename in os.listdir(dir):
        if os.path.isfile(os.path.join(dir, filename)):
            new_filename = filename[0].lower() + filename[1:]
            parts = new_filename.split('.')
            if len(parts) > 1:
                parts[-2] += '.model'
                new_filename = '.'.join(parts)
            os.rename(os.path.join(dir, filename), os.path.join(dir, new_filename))

dir_path = 'models'

rename_files(dir_path)