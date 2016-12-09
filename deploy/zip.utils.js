var fs = require('fs'),
  archiver = require('archiver'),
  path = require('path'),
  logger = require('./common/logger.utils'),
  Promise = require('bluebird');

exports.zip = function (outputPath, filesList) {
  return new Promise((resolve, reject) => {
    if (filesList && filesList.length > 0) {
      logger.info('Write zip file to ' + outputPath);

      var archive = archiver('zip');
      var output = fs.createWriteStream(outputPath);
      archive.pipe(output);

      output.on('close', function () {
        logger.info('Zip ' + outputPath + ' is created');
        logger.debug(archive.pointer() + ' total bytes');
        logger.debug('archiver has been finalized and the output file descriptor has closed.');

        resolve(outputPath);
      });

      archive.on('error', function (err) {
        reject(err);
      });

      filesList.forEach(function (file) {
        if (fs.lstatSync(file).isDirectory()) {
          logger.debug('Add directory ' + file + ' to zip');
          archive.directory(file, path.basename(file));
        }
        else if (fs.lstatSync(file).isFile()) {
          logger.debug('Add file ' + file + ' to zip');
          archive.append(fs.createReadStream(file), {name: path.basename(file)})
        }
      });
      archive.finalize();
    }
    else {
      reject(new Error('no file to zip'));
    }
  });
};
