<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

class CountryController extends Controller
{
    
    public function countryListAction($params = null) {
        
        $em = $this->getDoctrine()->getManager();
        $dql = "SELECT c FROM ChallengeReportBundle:Country c";
        $query = $em->createQuery($dql);
        
        $countries = $query->execute();
        
        return $this->render(
            'ChallengeReportBundle:Country:countrySelect.html.twig',
            array('countries' => $countries, 'params' => $params)
        );
    }
    
    
    /**
     * @Route("/countries")
     * @Template()
     */
    public function countriesAction() {

        $em = $this->getDoctrine()->getManager();
        $dql = "SELECT c FROM ChallengeReportBundle:Country c";
        $query = $em->createQuery($dql);

        $paginator = $this->get('knp_paginator');
        $pagination = $paginator->paginate(
                $query, $this->get('request')->query->get('page', 1)/* page number */, 10/* limit per page */
        );

        // parameters to template
        return array('pagination' => $pagination);
    }

}
