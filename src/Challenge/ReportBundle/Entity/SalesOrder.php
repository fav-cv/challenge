<?php

namespace Challenge\ReportBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * SalesOrder
 *
 * @ORM\Table(name="sales_order")
 * @ORM\Entity
 */
class SalesOrder
{
    /**
     * @var integer
     *
     * @ORM\Column(name="sales_order_id", type="integer", nullable=false)
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="IDENTITY")
     */
    private $salesOrderId;

    /**
     * @var string
     *
     * @ORM\Column(name="username", type="string", length=255, nullable=false)
     */
    private $username;

    /**
     * @var float
     *
     * @ORM\Column(name="total_price", type="decimal", nullable=false)
     */
    private $totalPrice;
    
    /**
     * @var \DateTime
     *
     * @ORM\Column(name="creation_date", type="datetime", nullable=false)
     */
    private $creationDate;

    /**
     * @var \Challenge\ReportBundle\Entity\Country
     *
     * @ORM\ManyToOne(targetEntity="Challenge\ReportBundle\Entity\Country")
     * @ORM\JoinColumns({
     *   @ORM\JoinColumn(name="country_id", referencedColumnName="country_id")
     * })
     */
    private $country;



    /**
     * Get salesOrderId
     *
     * @return integer 
     */
    public function getSalesOrderId()
    {
        return $this->salesOrderId;
    }

    /**
     * Set username
     *
     * @param string $username
     * @return SalesOrder
     */
    public function setUsername($username)
    {
        $this->username = $username;
    
        return $this;
    }

    /**
     * Get username
     *
     * @return string 
     */
    public function getUsername()
    {
        return $this->username;
    }

    /**
     * Set totalPrice
     *
     * @param float $totalPrice
     * @return SalesOrder
     */
    public function setTotalPrice($totalPrice)
    {
        $this->totalPrice = $totalPrice;
    
        return $this;
    }

    /**
     * Get totalPrice
     *
     * @return float 
     */
    public function getTotalPrice()
    {
        return $this->totalPrice;
    }

    /**
     * Set country
     *
     * @param \Challenge\ReportBundle\Entity\Country $country
     * @return SalesOrder
     */
    public function setCountry(\Challenge\ReportBundle\Entity\Country $country = null)
    {
        $this->country = $country;
    
        return $this;
    }

    /**
     * Get country
     *
     * @return \Challenge\ReportBundle\Entity\Country 
     */
    public function getCountry()
    {
        return $this->country;
    }

    /**
     * Set creationDate
     *
     * @param \DateTime $creationDate
     * @return SalesOrder
     */
    public function setCreationDate($creationDate)
    {
        $this->creationDate = $creationDate;
    
        return $this;
    }

    /**
     * Get creationDate
     *
     * @return \DateTime 
     */
    public function getCreationDate()
    {
        return $this->creationDate;
    }
}