<?php

namespace Typemill\Controllers;

use Slim\Http\Request;
use Slim\Http\Response;
use Typemill\Models\Folder;
use Typemill\Extensions\ParsedownExtension;

class ControllerAuthorEditor extends ControllerAuthor
{
	/**
	* Show Content for raw editor
	* 
	* @param obj $request the slim request object
	* @param obj $response the slim response object
	* @return obje $response with redirect to route
	*/
	
	public function showContent(Request $request, Response $response, $args)
	{
		# get params from call
		$this->uri 		= $request->getUri()->withUserInfo('');
		$this->params	= isset($args['params']) ? ['url' => $this->uri->getBasePath() . '/' . $args['params']] : ['url' => $this->uri->getBasePath()];
		
		# set structure
		if(!$this->setStructureDraft()){ return $this->renderIntern404($response, array( 'navigation' => true, 'content' => $this->errors )); }
		
		# set information for homepage
		$this->setHomepage($args);

		# set item
		if(!$this->setItem()){ return $this->renderIntern404($response, array( 'navigation' => $this->structure, 'settings' => $this->settings, 'content' => $this->errors )); }

		# we have to check ownership here to use it for permission-check in tempates
		$this->checkContentOwnership();
		
		# get the breadcrumb (here we need it only to mark the actual item active in navigation)
		$breadcrumb = isset($this->item->keyPathArray) ? Folder::getBreadcrumb($this->structureDraft, $this->item->keyPathArray) : false;
		
		# set the status for published and drafted
		$this->setPublishStatus();

		# set path
		$this->setItemPath($this->item->fileType);

		# add the modified date for the file
		$this->item->modified	= ($this->item->published OR $this->item->drafted) ? filemtime($this->settings['contentFolder'] . $this->path) : false;
		
		# read content from file
		if(!$this->setContent()){ return $this->renderIntern404($response, array( 'navigation' => $this->structure, 'settings' => $this->settings, 'content' => $this->errors )); }
		
		$content = $this->content;
		$title = false;

		# if content is an array, then it is a draft
		if(is_array($content))
		{
			# transform array to markdown
			$parsedown = new ParsedownExtension($this->uri->getBaseUrl());			
			$content = $parsedown->arrayBlocksToMarkdown($content);
		}

		# if there is content
		if($content != '')
		{
			# normalize linebreaks
			$content = str_replace(array("\r\n", "\r"), "\n", $content);
			$content = trim($content, "\n");
			
			# and strip out title
			if($content[0] == '#')
			{
				$contentParts = explode("\n", $content, 2);
				$title = trim($contentParts[0],  "# \t\n\r\0\x0B");
				$content = trim($contentParts[1]);
			}
		}

		return $this->renderIntern($response, 'editor/editor-raw.twig', array(
			'acl'			=> $this->c->acl,
			'mycontent'		=> $this->mycontent,
			'navigation' 	=> $this->structureDraft, 
			'homepage' 		=> $this->homepage, 
			'title' 		=> $title, 
			'content' 		=> $content, 
			'item' 			=> $this->item, 
			'settings' 		=> $this->settings
		));
	}
	
	/**
	* Show Content for blox editor
	* 
	* @param obj $request the slim request object
	* @param obj $response the slim response object
	* @return obje $response with redirect to route
	*/
	
	public function showBlox(Request $request, Response $response, $args)
	{
		# get params from call
		$this->uri 		= $request->getUri()->withUserInfo('');
		$this->params	= isset($args['params']) ? ['url' => $this->uri->getBasePath() . '/' . $args['params']] : ['url' => $this->uri->getBasePath()];

		# set structure
		if(!$this->setStructureDraft()){ return $this->renderIntern404($response, array( 'navigation' => true, 'content' => $this->errors )); }

		# set information for homepage
		$this->setHomepage($args);

		# set item
		if(!$this->setItem()){ return $this->renderIntern404($response, array( 'navigation' => $this->structureDraft, 'settings' => $this->settings, 'content' => $this->errors )); }

		# we have to check ownership here to use it for permission-check in tempates
		$this->checkContentOwnership();

		# set the status for published and drafted
		$this->setPublishStatus();
		
		# set path
		$this->setItemPath($this->item->fileType);

		# add the modified date for the file
		$this->item->modified	= ($this->item->published OR $this->item->drafted) ? filemtime($this->settings['contentFolder'] . $this->path) : false;

		# read content from file
		if(!$this->setContent()){ return $this->renderIntern404($response, array( 'navigation' => $this->structure, 'settings' => $this->settings, 'content' => $this->errors )); }

		$content = $this->content;

		if($content == '')
		{
			$content = [];
		}
		
		# initialize parsedown extension
		$parsedown = new ParsedownExtension($this->uri->getBaseUrl());

		# to fix footnote-logic in parsedown, set visual mode to true
		$parsedown->setVisualMode();

		# if content is not an array, then transform it
		if(!is_array($content))
		{
			# turn markdown into an array of markdown-blocks
			$content = $parsedown->markdownToArrayBlocks($content);
		}
		
		# needed for ToC links
		$relurl = '/tm/content/' . $this->settings['editor'] . '/' . $this->item->urlRel;
		
		foreach($content as $key => $block)
		{
			/* parse markdown-file to content-array */
			$contentArray 	= $parsedown->text($block);

			/* parse markdown-content-array to content-string */
			$content[$key]	= $parsedown->markup($contentArray);
		}

		# extract title and delete from content array, array will start at 1 after that.
		$title = '# add title';
		if(isset($content[0]))
		{
			$title = $content[0];
			unset($content[0]);			
		}

		return $this->renderIntern($response, 'editor/editor-blox.twig', array(
			'acl'			=> $this->c->acl, 
			'mycontent'		=> $this->mycontent,
			'navigation' 	=> $this->structureDraft,
			'homepage' 		=> $this->homepage,
			'title' 		=> $title, 
			'content' 		=> $content, 
			'item' 			=> $this->item,
			'settings' 		=> $this->settings 
		));
	}
}