
import * as gulp from 'gulp';
import * as zip from 'gulp-zip';
import * as child_process from 'child_process';
import * as del from 'del';
import * as fs from 'fs';
import * as stream from 'stream';
import * as path from 'path';
import * as through from 'through2';
import * as vinyl from 'vinyl';

const PACKAGE_NAME = require('./package.json').name;

function command(cmd: string, args?: string[], options?: child_process.SpawnOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const process = child_process.spawn(cmd, args, Object.assign({stdio: 'inherit', shell: true}, options || {}));

    process.once('error', err => {
      reject(err);
    });

    process.once('exit', (code, signal) => {
      if(code === 0)
        return resolve();

      return reject({code: code, signal: signal});
    });
  });
}

function commandWithResults(cmd: string, args?: string[], options?: child_process.SpawnOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const process = child_process.spawn(cmd, args, Object.assign({stdio: ['inherit', 'pipe', 'inherit'], shell: true}, options || {}));

    let result = '';
    process.stdout.pipe(new stream.Writable({write: chunk => result += chunk}));

    process.once('error', err => {
      reject(err);
    });

    process.once('exit', (code, signal) => {
      if(code === 0)
        return resolve(result);

      return reject({code: code, signal: signal});
    });
  });
}

gulp.task('clean', () => {
  return del('dist');
});

gulp.task('create-dist-directory', done => {
  fs.mkdir('dist', done);
});

gulp.task('create-package-contents', () => {
  return commandWithResults('npm', ['pack', '..'], {cwd: 'dist'})
    .then(result => console.log(result.trimRight()) || result.trimRight())
    .then(pkg => command('npm', ['--only=production', '--no-save', '--prefix dist', 'install', `./dist/${pkg}`]));
});

gulp.task('compile-typescript', () => {
  return command(path.normalize('../../../node_modules/.bin/tsc.cmd'), [], {cwd: `dist/node_modules/${PACKAGE_NAME}`, shell: false});
});

gulp.task('create-zip-archive', () => {
  return gulp.src(`dist/node_modules/${PACKAGE_NAME}/**`)
    .pipe(through.obj((file: vinyl, enc, callback) => {
      // Set permissions; directories were missing the execute bit from Windows
      if(file.stat) {
        if(file.stat.isDirectory())
          file.stat.mode = 0o40555;
        else
          file.stat.mode = 0o100444;
      }

      callback(null, file);
    }))
    .pipe(zip(`${PACKAGE_NAME}.zip`))
    .pipe(gulp.dest('dist'));
});

gulp.task('build', gulp.series(
  'clean',
  'create-dist-directory',
  'create-package-contents',
  'compile-typescript',
  'create-zip-archive'
));

gulp.task('default', gulp.series('build'));

