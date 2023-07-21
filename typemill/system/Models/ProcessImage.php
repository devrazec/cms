<?php
namespace Typemill\Models;

use Slim\Http\UploadedFile;
use Typemill\Models\Helpers;

class ProcessImage extends ProcessAssets
{
	public function createImage(string $image, string $name, array $desiredSizes, $overwrite = NULL)
	{
		# fix error from jpeg-library
		ini_set ('gd.jpeg_ignore_warning', 1);
		error_reporting(E_ALL & ~E_NOTICE);
		
		# clear temporary folder
		$this->clearTempFolder();

		# set the name of the image 
		$this->setFileName($name, 'image', $overwrite);

		# decode the image from base64-string
		$imageDecoded	= $this->decodeImage($image);
		$imageData		= $imageDecoded["image"];
		$imageType		= $imageDecoded["type"];
		
		if($imageType == 'svg+xml')
		{
			# store the original name as txt-file
			$tmpname = fopen($this->tmpFolder . $this->getName() . ".svg.txt", "w");

			# store the same svg file for original, live and thumb.
			$this->saveOriginal($this->tmpFolder, $imageData, $name = 'original', 'svg');
			$this->saveOriginal($this->tmpFolder, $imageData, $name = 'live', 'svg');
			$this->saveOriginal($this->tmpFolder, $imageData, $name = 'thumbs', 'svg');

			return true;
		}

		$this->setExtension($imageType);

		# transform image-stream into image
		$image 			= imagecreatefromstring($imageData);
		
		# get the size of the original image
		$imageSize 		= $this->getImageSize($image);
		
		# check the desired sizes and calculate the height, if not set
		$desiredSizes	= $this->setHeight($imageSize, $desiredSizes);
		
		# resize the images
		$resizedImages	= $this->imageResize($image, $imageSize, $desiredSizes, $imageType);

		# store the original name as txt-file
		$tmpname = fopen($this->tmpFolder . $this->getName() . '.' . $imageType .  ".txt", "w");

		$this->saveOriginal($this->tmpFolder, $imageData, $name = 'original', $imageType);

		# temporary store resized images
		foreach($resizedImages as $key => $resizedImage)
		{
			$this->saveImage($this->tmpFolder, $resizedImage, $key, $imageType);
		}
	
		# if the image is an animated gif, then overwrite the resized version for live use with the original version
		if($imageType == "gif" && $this->detectAnimatedGif($imageData))
		{
			$this->saveOriginal($this->tmpFolder, $imageData, $name = 'live', $imageType);			
		}
	
		return true;
	}
	
	public function detectAnimatedGif($image_file_contents)
	{
		$is_animated = preg_match('#(\x00\x21\xF9\x04.{4}\x00\x2C.*){2,}#s', $image_file_contents);
		if ($is_animated == 1)
		{
			return true;
		}
		return false;
	}
	
	public function publishImage($noresize = NULL)
	{
		# name is stored in temporary folder as name of the .txt-file
		foreach(glob($this->tmpFolder . '*.txt') as $imagename)
		{
			$tmpname = str_replace('.txt', '', basename($imagename));

			# set extension and sanitize name. Overwrite because this has been checked before
			$this->setFileName($tmpname, 'image', $overwrite = true);

			unlink($imagename);
		}

		$name 			=  uniqid();

		if($this->filename && $this->extension)
		{
			$name 		= $this->filename;
		}

		$files 			= scandir($this->tmpFolder);
		$success		= true;
		
		foreach($files as $file)
		{
			if (!in_array($file, array(".","..")))
			{
				$tmpfilename 	= explode(".", $file);
				
				if($tmpfilename[0] == 'original')
				{
					if($noresize)
					{
						$success = copy($this->tmpFolder . $file, $this->liveFolder . $name . '.' . $tmpfilename[1]);
					}
					$success = rename($this->tmpFolder . $file, $this->originalFolder . $name . '.' . $tmpfilename[1]);
				}
				if($tmpfilename[0] == 'live')
				{
					if($noresize)
					{
						$success = unlink($this->tmpFolder . $file);
					}
					else
					{
						$success = rename($this->tmpFolder . $file, $this->liveFolder . $name . '.' . $tmpfilename[1]);
					}
				}
				if($tmpfilename[0] == 'thumbs')
				{
					$success = rename($this->tmpFolder . $file, $this->thumbFolder . $name . '.' . $tmpfilename[1]);
				}
			}
		}
		
		if($success)
		{
			# return true;
			return 'media/live/' . $name . '.' . $tmpfilename[1];
		}
		
		return false;
	}
	
	public function decodeImage(string $image)
	{
        $imageParts 	= explode(";base64,", $image);
        $imageType		= explode("/", $imageParts[0]);
		$imageData		= base64_decode($imageParts[1]);
	
		if ($imageData !== false)
		{
			return array("image" => $imageData, "type" => $imageType[1]);
		}
		
		return false;
	}

	public function getImageSize($image)
	{
		$width = imagesx($image);
		$height = imagesy($image);
		return array('width' => $width, 'height' => $height);
	}
	
	public function setHeight(array $imageSize, array $desiredSizes)
	{
		foreach($desiredSizes as $key => $desiredSize)
		{
			# if desired size is bigger than the actual image, then drop the desired sizes and use the actual image size instead
			if($desiredSize['width'] > $imageSize['width'])
			{
				$desiredSizes[$key] = $imageSize;
				continue;
			}
			
			if(!isset($desiredSize['height']))
			{
				$resizeFactor					= $imageSize['width'] / $desiredSize['width'];
				$desiredSizes[$key]['height']	= round( ($imageSize['height'] / $resizeFactor), 0);
			}
		}
		return $desiredSizes;
	}

	public function imageResize($imageData, array $source, array $desiredSizes, $imageType)
	{

		$copiedImages			= array();

		foreach($desiredSizes as $key => $desired)
		{
			// resize
		    $ratio = max($desired['width']/$source['width'], $desired['height']/$source['height']);
		    $h = $desired['height'] / $ratio;
		    $x = ($source['width'] - $desired['width'] / $ratio) / 2;
		    $y = ($source['height'] - $desired['height'] / $ratio) / 2;
		    $w = $desired['width'] / $ratio;

			$new = imagecreatetruecolor($desired['width'], $desired['height']);

		  	// preserve transparency
		  	if($imageType == "gif" or $imageType == "png" or $imageType == "webp")
		  	{
		    	imagecolortransparent($new, imagecolorallocatealpha($new, 0, 0, 0, 127));
		    	imagealphablending($new, false);
		    	imagesavealpha($new, true);
		  	}

		  	imagecopyresampled($new, $imageData, 0, 0, $x, $y, $desired['width'], $desired['height'], $w, $h);

			$copiedImages[$key]		= $new;
		}

		return $copiedImages;
	}
	
	# save original in temporary folder
	public function saveOriginal($folder, $image, $name, $type)
	{		
		$path = $folder . $name . '.' . $type;
		
		file_put_contents($path, $image);
	}


	# save resized images in temporary folder
	public function saveImage($folder, $image, $name, $type)
	{
		$type = strtolower($type);

		if($type == "png")
		{
			$result = imagepng( $image, $folder . $name . '.png' );
		}
		elseif($type == "gif")
		{
			$result = imagegif( $image, $folder . $name . '.gif' );
		}
		elseif($type == "webp")
		{
			$result = imagewebp( $image, $folder . $name . '.webp', 100);
		}
		elseif($type == "jpg" OR $type == "jpeg")
		{
			$result = imagejpeg( $image, $folder . $name . '.' . $type );
		}
		else
		{
			# image type not supported
			return false;
		}
		
		imagedestroy($image);
		
		if($result)
		{
			return $name . '.' . $type;
		}
		
		return false;
	}

	/**
	 * Moves the uploaded file to the upload directory. Only used for settings / NON VUE.JS uploads
	 *
	 * @param string $directory directory to which the file is moved
	 * @param UploadedFile $uploadedFile file uploaded file to move
	 * @return string filename of moved file
	 */
	public function moveUploadedImage(UploadedFile $uploadedFile, $overwrite = false, $name = false, $folder = NULL)
	{
		$this->setFileName($uploadedFile->getClientFilename(), 'file');
		
		if($name)
		{
			$this->setFileName($name . '.' . $this->extension, 'file', $overwrite);
		}

		if(!$folder)
		{
			$folder = $this->liveFolder;
		}	

	    $uploadedFile->moveTo($folder . $this->getFullName());

	    return $this->getFullName();
	}	
	
	public function deleteImage($name)
	{

		# validate name 
		$name = basename($name);

		$result = true;

		if(!file_exists($this->originalFolder . $name) OR !unlink($this->originalFolder . $name))
		{
			$result = false;
		}

		if(!file_exists($this->liveFolder . $name) OR !unlink($this->liveFolder . $name))
		{
			$result = false;
		}

		if(!file_exists($this->thumbFolder . $name) OR !unlink($this->thumbFolder . $name))
		{
			$result = false;
		}

		# delete custom images (resized and grayscaled) 
		# array_map('unlink', glob("some/dir/*.txt"));
		$pathinfo = pathinfo($name);

		foreach(glob($this->customFolder . $pathinfo['filename'] . '\-*.' . $pathinfo['extension']) as $image)
		{
			# you could check if extension is the same here
			if(!unlink($image))
			{
				$success = false;
			}
		}
		
		return $result;
	}


	public function deleteImageWithName($name)
	{
		# e.g. delete $name = 'logo...';

		$name = basename($name);

		if($name != '' && !in_array($name, array(".","..")))
		{
			foreach(glob($this->liveFolder . $name) as $file)
			{
				unlink($file);
			}
			foreach(glob($this->originalFolder . $name) as $file)
			{
				unlink($file);
			}
			foreach(glob($this->thumbFolder . $name) as $file)
			{
				unlink($file);
			}
		}
	}

	public function copyImage($name,$sourcefolder,$targetfolder)
	{
		copy($sourcefolder . $name, $targetfolder . $name);
	}

	/*
	* scans content of a folder (without recursion)
	* vars: folder path as string
	* returns: one-dimensional array with names of folders and files
	*/
	public function scanMediaFlat()
	{
		$thumbs 		= array_diff(scandir($this->thumbFolder), array('..', '.'));
		$imagelist		= array();

		foreach ($thumbs as $key => $name)
		{
			if (file_exists($this->liveFolder . $name))
			{
				$imagelist[] = [
					'name' 		=> $name,
					'timestamp'	=> filemtime($this->liveFolder . $name),
					'src_thumb'	=> 'media/thumbs/' . $name,
					'src_live'	=> 'media/live/' . $name,
				];
			}
		}

		$imagelist = Helpers::array_sort($imagelist, 'timestamp', SORT_DESC);

		return $imagelist;
	}


	public function getImageDetails($name, $structure)
	{		
		$name = basename($name);

		if (!in_array($name, array(".","..")) && file_exists($this->liveFolder . $name))
		{
			$imageinfo 		= getimagesize($this->liveFolder . $name);

			if(!$imageinfo && pathinfo($this->liveFolder . $name, PATHINFO_EXTENSION) == 'svg')
			{
				$imagedetails = [
					'name' 		=> $name,
					'timestamp'	=> filemtime($this->liveFolder . $name),
					'bytes' 	=> filesize($this->liveFolder . $name),
					'width'		=> '---',
					'height'	=> '---',
					'type'		=> 'svg',
					'src_thumb'	=> 'media/thumbs/' . $name,
					'src_live'	=> 'media/live/' . $name,
					'pages'		=> $this->findPagesWithUrl($structure, $name, $result = [])
				];				
			}
			else
			{
				$imagedetails = [
					'name' 		=> $name,
					'timestamp'	=> filemtime($this->liveFolder . $name),
					'bytes' 	=> filesize($this->liveFolder . $name),
					'width'		=> $imageinfo[0],
					'height'	=> $imageinfo[1],
					'type'		=> $imageinfo['mime'],
					'src_thumb'	=> 'media/thumbs/' . $name,
					'src_live'	=> 'media/live/' . $name,
					'pages'		=> $this->findPagesWithUrl($structure, $name, $result = [])
				];
			}

			return $imagedetails;
		}

		return false;
	}

	public function generateThumbs()
	{
		# generate images from live folder to 'tmthumbs'
		$liveImages 	= scandir($this->liveFolder);

		$result = false;

		foreach ($liveImages as $key => $name)
		{
			if (!in_array($name, array(".","..")))
			{
				$result = $this->generateThumbFromImageFile($name);
			}
		}
		return $result;
	}

	public function generateThumbFromImageFile($filename)
	{
		$this->setFileName($filename, 'image', $overwrite = true);

		# if($this->extension == 'jpg') $this->extension = 'jpeg';

		$image 			= $this->createImageFromPath($this->liveFolder . $filename, $this->extension);

		$originalSize 	= $this->getImageSize($image);

		$thumbSize		= $this->desiredSizes['thumbs'];

		$thumb 			= $this->imageResize($image, $originalSize, ['thumbs' => $thumbSize ], $this->extension);

		$saveImage 		= $this->saveImage($this->thumbFolder, $thumb['thumbs'], $this->filename, $this->extension);
		if($saveImage)
		{
			return true;
		}
		return false;
	}

	# filename and imagepath can be a tmp-version after upload.
	public function generateSizesFromImageFile($filename, $imagePath)
	{
		$this->setFileName($filename, 'image');

#		if($this->extension == 'jpg') $this->extension = 'jpeg';

		$image 			= $this->createImageFromPath($imagePath, $this->extension);

		$originalSize 	= $this->getImageSize($image);

		$resizedImages 	= $this->imageResize($image, $originalSize, $this->desiredSizes, $this->extension);

		return $resizedImages;
	}

	public function grayscale($imagePath, $extension)
	{
		$image 	= $this->createImageFromPath($imagePath, $extension);

		imagefilter($image, IMG_FILTER_GRAYSCALE);

		return $image;
	}

	public function createImageFromPath($imagePath, $extension)
	{
		switch($extension)
		{
			case 'gif': $image = imagecreatefromgif($imagePath); break;
			case 'jpg' :
			case 'jpeg': $image = imagecreatefromjpeg($imagePath); break;
			case 'png': $image = imagecreatefrompng($imagePath); break;
			case 'webp': $image = imagecreatefromwebp($imagePath); break;
			default: return 'image type not supported';
		}
		
		return $image;		
	}
}